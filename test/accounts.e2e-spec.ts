import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { sql } from 'drizzle-orm';

import { AppModule } from '../src/app.module';
import { persons } from '../src/database/schema';
import { DB_CONNECTION } from '../src/database/injectionTokens';
import { GlobalExceptionFilter } from '../src/filters/http-exception.filter';

import type {
  TDatabase,
  TAccountSelect,
  IAccountStatement,
} from '../src/types';

describe('Accounts (e2e)', () => {
  let app: INestApplication<App>;
  let db: TDatabase;
  let personId: number;

  beforeAll(async () => {
    const testModule: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = testModule.createNestApplication();
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    db = app.get<TDatabase>(DB_CONNECTION);
  });

  beforeEach(async () => {
    await db.execute(
      sql`TRUNCATE transactions, accounts, persons RESTART IDENTITY CASCADE`,
    );
    const [person] = await db
      .insert(persons)
      .values({
        name: 'Test Person',
        document: '12345678900',
        birthDate: '1990-01-01',
      })
      .returning();
    personId = person.personId;
  });

  afterAll(async () => {
    await app.close();
  });

  const newAccount = (overrides: Record<string, unknown> = {}) => ({
    personId,
    balance: '1000.00',
    dailyWithdrawalLimit: '500.00',
    accountType: 1,
    ...overrides,
  });

  // Creates an account and returns the response body, typed as TAccountSelect.
  const createAccount = async (
    overrides: Record<string, unknown> = {},
  ): Promise<TAccountSelect> => {
    const res = await request(app.getHttpServer())
      .post('/accounts')
      .send(newAccount(overrides));
    return res.body as TAccountSelect;
  };

  // --- POST /accounts --------------------------------------------------------

  describe('POST /accounts', () => {
    it('returns 201 and the created account', async () => {
      const res = await request(app.getHttpServer())
        .post('/accounts')
        .send(newAccount())
        .expect(201);

      const body = res.body as TAccountSelect;
      expect(typeof body.accountId).toBe('number');
      expect(body.personId).toBe(personId);
      expect(body.balance).toBe('1000.0000');
      expect(body.dailyWithdrawalLimit).toBe('500.0000');
      expect(body.isActive).toBe(true);
      expect(body.accountType).toBe(1);
    });

    it('returns 400 when required fields are missing', () => {
      return request(app.getHttpServer())
        .post('/accounts')
        .send({ personId })
        .expect(400);
    });
  });

  // --- POST /accounts/:id/deposit --------------------------------------------

  describe('POST /accounts/:accountId/deposit', () => {
    it('returns 200 and increases the balance', async () => {
      const account = await createAccount({ balance: '100.00' });

      const res = await request(app.getHttpServer())
        .post(`/accounts/${account.accountId}/deposit`)
        .send({ amount: '50.00' })
        .expect(200);

      expect((res.body as TAccountSelect).balance).toBe('150.0000');
    });

    it('returns 403 when the account is blocked', async () => {
      const account = await createAccount({ isActive: false });

      return request(app.getHttpServer())
        .post(`/accounts/${account.accountId}/deposit`)
        .send({ amount: '50.00' })
        .expect(403);
    });

    it('returns 404 for an unknown account', () => {
      return request(app.getHttpServer())
        .post('/accounts/99999/deposit')
        .send({ amount: '50.00' })
        .expect(404);
    });
  });

  // --- POST /accounts/:id/withdraw -------------------------------------------

  describe('POST /accounts/:accountId/withdraw', () => {
    it('returns 200 and decreases the balance', async () => {
      const account = await createAccount({ balance: '200.00' });

      const res = await request(app.getHttpServer())
        .post(`/accounts/${account.accountId}/withdraw`)
        .send({ amount: '75.00' })
        .expect(200);

      expect((res.body as TAccountSelect).balance).toBe('125.0000');
    });

    it('returns 422 for insufficient funds', async () => {
      const account = await createAccount({ balance: '10.00' });

      return request(app.getHttpServer())
        .post(`/accounts/${account.accountId}/withdraw`)
        .send({ amount: '100.00' })
        .expect(422);
    });

    it('returns 422 when the daily withdrawal limit would be exceeded', async () => {
      const account = await createAccount({
        balance: '1000.00',
        dailyWithdrawalLimit: '50.00',
      });

      return request(app.getHttpServer())
        .post(`/accounts/${account.accountId}/withdraw`)
        .send({ amount: '100.00' })
        .expect(422);
    });

    it('returns 403 when the account is blocked', async () => {
      const account = await createAccount({ isActive: false });

      return request(app.getHttpServer())
        .post(`/accounts/${account.accountId}/withdraw`)
        .send({ amount: '50.00' })
        .expect(403);
    });

    it('returns 404 for an unknown account', () => {
      return request(app.getHttpServer())
        .post('/accounts/99999/withdraw')
        .send({ amount: '50.00' })
        .expect(404);
    });
  });

  // --- GET /accounts/:id/balance ---------------------------------------------

  describe('GET /accounts/:accountId/balance', () => {
    it('returns 200 and the current balance', async () => {
      const account = await createAccount({ balance: '250.00' });

      const res = await request(app.getHttpServer())
        .get(`/accounts/${account.accountId}/balance`)
        .expect(200);

      expect(res.text).toBe('250.0000');
    });

    it('returns 404 for an unknown account', () => {
      return request(app.getHttpServer())
        .get('/accounts/99999/balance')
        .expect(404);
    });
  });

  // --- GET /accounts/:id/statement -------------------------------------------

  describe('GET /accounts/:accountId/statement', () => {
    it('returns 200 with all transactions when no date filters are given', async () => {
      const account = await createAccount({ balance: '0.00' });

      await request(app.getHttpServer())
        .post(`/accounts/${account.accountId}/deposit`)
        .send({ amount: '100.00' });

      const res = await request(app.getHttpServer())
        .get(`/accounts/${account.accountId}/statement`)
        .expect(200);

      const statement = res.body as IAccountStatement;
      expect(statement.transactions).toHaveLength(1);
      expect(statement.transactions[0].value).toBe('100.0000');
      expect(statement.closingBalance).toBe('100.0000');
    });

    it('returns 200 with transactions filtered by date range', async () => {
      const account = await createAccount({ balance: '0.00' });

      await request(app.getHttpServer())
        .post(`/accounts/${account.accountId}/deposit`)
        .send({ amount: '100.00' });

      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86_400_000)
        .toISOString()
        .slice(0, 10);

      const res = await request(app.getHttpServer())
        .get(`/accounts/${account.accountId}/statement`)
        .query({ from: yesterday, to: today })
        .expect(200);

      expect((res.body as IAccountStatement).transactions).toHaveLength(1);
    });

    it('returns 404 for an unknown account', () => {
      return request(app.getHttpServer())
        .get('/accounts/99999/statement')
        .expect(404);
    });
  });

  // --- POST /accounts/:id/block ----------------------------------------------

  describe('POST /accounts/:accountId/block', () => {
    it('returns 200 and sets isActive to false', async () => {
      const account = await createAccount();

      const res = await request(app.getHttpServer())
        .post(`/accounts/${account.accountId}/block`)
        .expect(200);

      expect((res.body as TAccountSelect).isActive).toBe(false);
    });

    it('returns 404 for an unknown account', () => {
      return request(app.getHttpServer())
        .post('/accounts/99999/block')
        .expect(404);
    });
  });

  // --- POST /accounts/:id/unblock --------------------------------------------

  describe('POST /accounts/:accountId/unblock', () => {
    it('returns 200 and sets isActive to true', async () => {
      const account = await createAccount({ isActive: false });

      const res = await request(app.getHttpServer())
        .post(`/accounts/${account.accountId}/unblock`)
        .expect(200);

      expect((res.body as TAccountSelect).isActive).toBe(true);
    });

    it('returns 404 for an unknown account', () => {
      return request(app.getHttpServer())
        .post('/accounts/99999/unblock')
        .expect(404);
    });
  });
});
