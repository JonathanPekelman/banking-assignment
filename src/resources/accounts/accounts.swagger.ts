import { applyDecorators } from '@nestjs/common';

const today = new Date();
const toExample = today.toISOString().slice(0, 10);
const fromExample = new Date(
  today.getFullYear(),
  today.getMonth() - 1,
  today.getDate(),
)
  .toISOString()
  .slice(0, 10);
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

const accountSchema = {
  type: 'object',
  properties: {
    accountId: { type: 'integer', example: 1 },
    personId: { type: 'integer', example: 1 },
    balance: { type: 'string', example: '1000.0000' },
    dailyWithdrawalLimit: { type: 'string', example: '500.0000' },
    isActive: { type: 'boolean', example: true },
    accountType: { type: 'integer', example: 1 },
  },
};

const statementSchema = {
  type: 'object',
  properties: {
    account: accountSchema,
    openingBalance: { type: 'string', example: '900.0000' },
    closingBalance: { type: 'string', example: '1000.0000' },
    transactions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          transactionId: { type: 'integer', example: 1 },
          accountId: { type: 'integer', example: 1 },
          value: { type: 'string', example: '100.0000' },
          transactionDate: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
};

const accountIdParam = {
  name: 'accountId',
  type: Number,
  description: 'The numeric account ID',
};

// Common response decorators
const ApiNotFound = ApiResponse({
  status: 404,
  description: 'Account not found',
});
const ApiInactive = ApiResponse({
  status: 403,
  description: 'Account is inactive',
});
const ApiValidation = ApiResponse({
  status: 400,
  description: 'Validation error',
});

// Builds the amount request body for deposit/withdrawal endpoints
const fundsBody = (description: string, example: string) =>
  ApiBody({
    schema: {
      type: 'object',
      required: ['amount'],
      properties: {
        amount: { type: 'string', example, description },
      },
    },
  });

export const ApiAccounts = ApiTags('Accounts');

export const ApiCreateAccount = () =>
  applyDecorators(
    ApiOperation({ summary: 'Create a new bank account' }),
    ApiBody({
      schema: {
        type: 'object',
        required: [
          'personId',
          'balance',
          'dailyWithdrawalLimit',
          'accountType',
        ],
        properties: {
          personId: { type: 'integer', example: 1 },
          balance: {
            type: 'string',
            example: '0.00',
            description: 'Opening balance',
          },
          dailyWithdrawalLimit: { type: 'string', example: '500.00' },
          isActive: { type: 'boolean', example: true, default: true },
          accountType: {
            type: 'integer',
            minimum: 1,
            maximum: 5,
            example: 1,
            description: 'Account type (1–5)',
          },
        },
      },
    }),
    ApiResponse({
      status: 201,
      description: 'Account created',
      schema: accountSchema,
    }),
    ApiValidation,
  );

export const ApiDepositFunds = () =>
  applyDecorators(
    ApiOperation({ summary: 'Deposit funds into an account' }),
    ApiParam(accountIdParam),
    fundsBody('Amount to deposit', '100.00'),
    ApiResponse({
      status: 201,
      description: 'Funds deposited',
      schema: accountSchema,
    }),
    ApiNotFound,
    ApiInactive,
    ApiValidation,
  );

export const ApiWithdrawFunds = () =>
  applyDecorators(
    ApiOperation({ summary: 'Withdraw funds from an account' }),
    ApiParam(accountIdParam),
    fundsBody('Amount to withdraw', '50.00'),
    ApiResponse({
      status: 201,
      description: 'Funds withdrawn',
      schema: accountSchema,
    }),
    ApiNotFound,
    ApiInactive,
    ApiResponse({
      status: 422,
      description: 'Insufficient funds or daily withdrawal limit exceeded',
    }),
    ApiValidation,
  );

export const ApiGetStatement = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get account statement, optionally filtered by date range',
    }),
    ApiParam(accountIdParam),
    ApiQuery({
      name: 'from',
      required: false,
      type: String,
      description: 'Start date (YYYY-MM-DD)',
      example: fromExample,
    }),
    ApiQuery({
      name: 'to',
      required: false,
      type: String,
      description: 'End date inclusive (YYYY-MM-DD)',
      example: toExample,
    }),
    ApiResponse({
      status: 200,
      description: 'Account statement',
      schema: statementSchema,
    }),
    ApiNotFound,
    ApiValidation,
  );

export const ApiGetBalance = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get current account balance' }),
    ApiParam(accountIdParam),
    ApiResponse({
      status: 200,
      description: 'Current balance',
      schema: { type: 'string', example: '1000.0000' },
    }),
    ApiNotFound,
  );

export const ApiBlockAccount = () =>
  applyDecorators(
    ApiOperation({ summary: 'Block an account' }),
    ApiParam(accountIdParam),
    ApiResponse({
      status: 201,
      description: 'Account blocked',
      schema: accountSchema,
    }),
    ApiNotFound,
  );

export const ApiUnblockAccount = () =>
  applyDecorators(
    ApiOperation({ summary: 'Unblock an account' }),
    ApiParam(accountIdParam),
    ApiResponse({
      status: 201,
      description: 'Account unblocked',
      schema: accountSchema,
    }),
    ApiNotFound,
  );
