# Architecture

## System Overview

A RESTful HTTP API for bank account management. It accepts JSON requests, validates them at the boundary, executes business logic against a PostgreSQL database, and returns JSON responses.

Supported operations: account creation, fund deposits and withdrawals, balance queries, account statements by date range, and account blocking/unblocking.

External boundaries:

- **Inbound** - HTTP clients (Swagger UI, Postman, frontend apps)
- **Outbound** - PostgreSQL database

---

## Tech Stack

| Technology | Role | Why |
|---|---|---|
| NestJS | HTTP framework | Structured, decorator-based framework with DI, pipes, filters, and interceptors out of the box |
| PostgreSQL | Database | Reliable relational DB with native support for exact numeric types |
| Drizzle ORM | Database access | Fully type-safe and SQL-close. Schema is the source of truth for all types |
| Zod | Input validation | Runtime schema validation with automatic TypeScript type inference at the HTTP boundary |
| Decimal.js | Monetary calculations | Eliminates floating-point rounding errors that `number` calculations cannot avoid. Also allows working with amounts of money that are larger than Number.MAX_SAFE_INTEGER |

---

## Module Map

```
AppModule --> ConfigModule
AppModule --> DatabaseModule
AppModule --> AccountsModule
AppModule --> TransactionsModule

    AccountsModule --> TransactionsModule
    AccountsModule --> AccountsController
    AccountsModule --> AccountsService

    TransactionsModule --> TransactionsService

    DatabaseModule -->|exports DB_CONNECTION| AccountsService
    DatabaseModule -->|exports DB_CONNECTION| TransactionsService
```

`DatabaseModule` is marked `@Global`, so it provides the Drizzle DB connection to the entire application without needing to be imported by every module.

`AccountsModule` imports `TransactionsModule` to access `TransactionsService`, which handles inserting transaction records and querying daily withdrawal totals.

---

## Request Lifecycle

Using `POST /accounts/:accountId/deposit` as an example:

```
HTTP Request
    |
    V
LoggingInterceptor          logs "--> POST /accounts/1/deposit"
    |
    V
AccountsController          routes to depositFunds(), runs ZodValidationPipe on body
    |
    V
ZodValidationPipe           parses & validates { amount } - throws 400 if invalid
    |
    V
AccountsService             opens a DB transaction:
    |                         1. SELECT account by ID - throws 404 if not found
    |                         2. Check isActive - throws 403 if inactive
    |                         3. UPDATE accounts SET balance += amount
    |                         4. INSERT into transactions
    |                       if any step fails, the transaction rolls back
    V
Drizzle ORM                 compiles typed queries, executes via pg Pool
    |
    V
PostgreSQL                  executes SQL, returns rows
    |
    V
AccountsService             returns updated account row
    |
    V
LoggingInterceptor          logs "<-- POST /accounts/1/deposit 201 12ms"
    |
    V
HTTP Response               { accountId, personId, balance, ... }
```

On any unhandled exception, `GlobalExceptionFilter` catches it and returns a consistent JSON error shape:

```json
{
  "statusCode": 500,
  "message": "An unexpected error occurred.",
  "timestamp": "2026-03-03T18:00:00.000Z",
  "path": "/accounts/1/deposit"
}
```

---

## Database Schema

```
persons {
    serial person_id PK
    text name
    text document UK
    date birth_date
}

accounts {
    serial account_id PK
    integer person_id FK
    numeric balance
    numeric daily_withdrawal_limit
    boolean is_active
    integer account_type
}

transactions {
    serial transaction_id PK
    integer account_id FK
    numeric value
    timestamp transaction_date
}
```

Monetary columns (`balance`, `daily_withdrawal_limit`, `value`) use `numeric(15, 4)` - an exact decimal type in PostgreSQL that avoids floating-point representation errors.

Transaction values are signed: positive for deposits, negative for withdrawals.

---

## Key Design Decisions

### NestJS over vanilla Express

Vanilla Express provides routing and middleware, but dependency injection, validation, error handling, logging, and module organisation all have to be built from scratch. NestJS provides all of these for you, making it a better fit for a structured, multi-resource API like this one. Its opinionated structure also means any developer familiar with NestJS can navigate the codebase right from the get-go.

### Drizzle ORM over raw node-postgres

Drizzle was chosen due to prior familiarity, which proved to be a good fit for this project. Compared to using node-postgres directly, Drizzle's schema-as-source-of-truth approach means all database types (`TAccountSelect`, `TAccountInsert`, etc.) are inferred directly from the table definitions - no manual type definitions required. Queries are written in an SQL-like style, so the difference from raw SQL is minimal while still providing full type safety.

### Decimal.js for monetary calculations

JavaScript's `number` type cannot represent a large amount of decimal fractions with accuracy (`0.1 + 0.2 === 0.30000000000000004`). All balance and limit comparisons use `Decimal` to ensure correct calculations. Amounts are stored as strings in PostgreSQL (`numeric`) and in JavaScript, only converted to `Decimal` for computation, and are then immediately serialised back to strings.

### DB transactions for atomicity

Deposit and withdrawal operations each open a Drizzle transaction that covers both the balance update and the transaction record insert. If either step fails, the entire operation rolls back. This guarantees the database never ends up in a state where a balance changed but no transaction was recorded, or vice versa. This is extremely important in the context of bank accounts as it directly affects a person's funds.
