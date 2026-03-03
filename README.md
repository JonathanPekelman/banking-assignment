# Banking API

A RESTful API for bank account management built with NestJS, Drizzle ORM, and PostgreSQL.

Supports account creation, fund deposits and withdrawals, balance queries, account statements by date range, and account blocking/unblocking.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS |
| Database | PostgreSQL |
| Database ORM | Drizzle ORM |
| Validation | Zod |
| Monetary operations | Decimal.js |

---

## Prerequisites

- **Node.js** v22+
- **npm** v10+
- **PostgreSQL** - or **Docker** (see Option B below)

---

## Option A - Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` if your local Postgres credentials don't match the default values.

### 3. Start the app

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build && npm run start:prod
```

---

## Option B - Docker Compose

### 1. Configure environment

```bash
cp .env.example .env
```

Fill in your credentials. No changes needed for `DATABASE_URL` - the app container is configured to connect to the database service automatically.

### 2. Build and start

```bash
docker compose up --build
```

This starts both the PostgreSQL database and the banking server. The banking server waits for the database to be healthy before starting.

---

## Database Setup (required for both options)

Postgres must be running before executing the commands listed below.

### Run migrations

```bash
npx drizzle-kit migrate
```

### Seed persons

```bash
npm run seed:persons
```

---

## Running Tests

### Unit Tests
```bash
# Unit tests
npm test

# Unit tests with coverage
npm run test:cov
```

### E2E Tests
```bash
# Create a .env.test file based on the test example file (edit what you need)
cp .env.test.example .env.test

# Run postgres container (If you have pg running locally that also works)
docker compose up db

# Run E2E tests
npm run test:e2e
```
---

## API Reference

All endpoints are prefixed with `/accounts`. Interactive documentation is available at `http://localhost:{APP_PORT}/docs` once the app is running.

| Method | Path | Description | Body / Params |
|--------|------|-------------|---------------|
| `POST` | `/accounts` | Create a new account | `{ personId, balance, dailyWithdrawalLimit, isActive?, accountType }` |
| `POST` | `/accounts/:accountId/deposit` | Deposit funds | `{ amount }` |
| `POST` | `/accounts/:accountId/withdraw` | Withdraw funds | `{ amount }` |
| `GET` | `/accounts/:accountId/balance` | Get current balance | - |
| `GET` | `/accounts/:accountId/statement` | Get account statement | Query: `from?`, `to?` (YYYY-MM-DD) |
| `POST` | `/accounts/:accountId/block` | Block an account | - |
| `POST` | `/accounts/:accountId/unblock` | Unblock an account | - |

### Notes

- All monetary values (`balance`, `dailyWithdrawalLimit`, `amount`) are strings representing decimal numbers (e.g. `"100.00"`)
- `accountType` must be an integer between 1 and 5
- Statement dates are inclusive - `to` defaults to end-of-day (23:59:59 UTC)
- Withdrawals are rejected if they would exceed the account's `dailyWithdrawalLimit`
