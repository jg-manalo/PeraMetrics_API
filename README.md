# PeraMetrics API

PeraMetrics API is a TypeScript Express backend for personal finance tracking. It allows users to register and authenticate, manage money sources, record income, expenses, and transfers, and generate period-based financial reports.

## What this project does

The API is designed to support a simple personal finance app, including:

- User registration and login
- Password reset flow
- Secure authenticated access using JWT
- Money source tracking (wallets, bank accounts, cash buckets, etc.)
- Transaction creation for income, expense, and transfer events
- Retrieval of transaction history and reports by date range
- PostgreSQL persistence via Drizzle ORM
- Redis support for reset-token caching
- Email sending for password reset requests

## Tech stack

- Node.js + TypeScript
- Express.js
- PostgreSQL
- Drizzle ORM
- Redis
- JWT authentication
- Vitest for tests
- Docker support for local development

## Project structure

```text
src/
  app.ts
  index.ts
  config/
  controllers/
  db/
  errors/
  middlewares/
  models/
  resources/
  routes/
  services/
  types/
  utils/
  validations/
```

## Requirements

Before running the API, make sure you have:

- Node.js 20+
- PostgreSQL running
- Redis running
- A `.env.development` for running development mode
- A `.env.production` for running production mode

## Environment variables

Create a `.env.development` file in the project root with values similar to:

```env
#server configuration
NODE_ENV=development

PORT=3000

#database configuration (NEON)
DATABASE_URL=postgres://neon:npg@neon-local:5432/

#ephemeral database configuration (NEON)
NEON_API_KEY=your_neon_api_key
NEON_PROJECT_ID=your_neon_project_id
PARENT_BRANCH_ID=your_parent_branch_id


#jwt secret
JWT_SECRET=your_secret

#redis configuration
REDIS_URL=redis://localhost:6379
REDIS_USERNAME=default
REDIS_PASSWORD=password

#Server Timezone
TZ=Asia/Manila

#Email sender configuration
RESEND_API_KEY=your_resend_api_key
RESEND_EMAIL_SENDER=your_email
```

## Install dependencies

```bash
npm install
```

## Run the app locally

Development mode:

```bash
npm run dev
```

Production build:

```bash
npm run build
npm start
```

Docker development:

```bash
#to run
npm run start-dev
#to close
npm run docker-dev-down
```

Docker production:

```bash
#to run
npm run start-prod
#to close
npm run docker-prod-down
```

## API base URL

```text
http://localhost:3000
```

## Authentication

Most protected routes require a JWT token in the `Authorization` header:

```http
Authorization: Bearer <token>
```

The token is returned by the login route.

For authenticated requests, send the access token as:

```http
Authorization: Bearer <access_token>
```

## Routes

### Health check

```http
GET /
```

Returns a simple success message indicating the API is running.

### Auth routes

#### Register a user

```http
POST /api/auth/register
```

Request body:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### Login

```http
POST /api/auth/login
```

Request body:

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

Response includes a JWT token.

#### Request password reset

```http
POST /api/auth/request-password-reset
```

Request body:

```json
{
  "email": "john@example.com"
}
```

#### Reset password

```http
POST /api/auth/reset-password
```

Request body:

```json
{
  "tokenHash": "reset_token_hash",
  "password": "newPassword123"
}
```

### User routes

All user routes require authentication.

#### Get user by ID

```http
GET /api/users/:uid
```

#### Update user

```http
PUT /api/users/:uid
```

Request body example:

```json
{
  "name": "John Updated",
  "email": "john.new@example.com",
  "password": "newPassword123"
}
```

#### Delete user

```http
DELETE /api/users/:uid
```

### Money source routes

All money source routes require authentication.

#### Create money source

```http
POST /api/moneysources
```

Request body:

```json
{
  "name": "Savings",
  "initialAmount": "1000.00"
}
```

#### Update money source

```http
PUT /api/moneysources/:uid
```

Request body:

```json
{
  "name": "Emergency Fund"
}
```

#### Delete money source

```http
DELETE /api/moneysources/:uid
```

### Transaction routes

All transaction routes require authentication.

#### Get all transactions

```http
GET /api/transactions
```

Optional query parameters:

```text
?from=2026-08-01&to=2026-08-31&type=income
```

#### Generate periodic report

```http
GET /api/transactions/report?from=2026-08-01&to=2026-08-31
```

#### Record income

```http
POST /api/transactions/income
```

Request body:

```json
{
  "name": "Salary",
  "amount": "3500.00",
  "moneySource": "money_source_uid"
}
```

#### Record expense

```http
POST /api/transactions/expense
```

Request body:

```json
{
  "name": "Rent",
  "amount": "1500.00",
  "moneySource": "money_source_uid"
}
```

#### Record transfer

```http
POST /api/transactions/transfer
```

Request body:

```json
{
  "name": "Transfer to Savings",
  "amount": "500.00",
  "moneySource": "source_money_source_uid",
  "destinationMoneySource": "<destination_money_source_uid>",
  "date": "2026-08-01"
}
```

#### Delete transaction

```http
DELETE /api/transactions/delete/:uid
```

## Current route additions

### Additional routes

The current API also exposes:

- `GET /api/auth/me`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/users/me`
- `GET /api/users/credentials`
- `GET /api/moneysources`
- `GET /api/moneysources/input`
- `DELETE /api/moneysources/bulk-delete`
- `PUT /api/transactions/:uid`
- `DELETE /api/transactions/bulk-delete`
- `GET /api/subscriptions`
- `POST /api/subscriptions`
- `PUT /api/subscriptions/:uid`
- `DELETE /api/subscriptions/:uid`
- `DELETE /api/subscriptions/bulk-delete`

Bulk-delete request payloads use the same structure for each resource:

```json
{
  "uids": [
    "<resource_uid_1>",
    "<resource_uid_2>"
  ]
}
```

Transaction update payload:

```json
{
  "name": "Updated transaction",
  "amount": "525.00",
  "moneySource": "<source_money_source_uid>",
  "destinationMoneySource": "<destination_money_source_uid>",
  "date": "2026-08-02",
  "category": "transfer"
}
```

Subscription request example:

```json
{
  "name": "NETFLIX",
  "amount": "15.99",
  "startDate": "2026-11-01",
  "duration": "MONTHLY",
  "moneySource": "<money_source_uid>"
}
```

Valid subscription durations are `WEEKLY`, `MONTHLY`, `QUARTERLY`, `ANNUAL`,
and `BIENNIAL`.

## Example workflow

1. Register a user:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123"}'
```

2. Log in to receive a token:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```

3. Create a money source:

```bash
curl -X POST http://localhost:3000/api/moneysources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Savings","initialAmount":"1000.00"}'
```

4. Record an income transaction:

```bash
curl -X POST http://localhost:3000/api/transactions/income \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Salary","amount":"3500.00","moneySource":"<money_source_uid>"}'
```

## Testing

Run the automated tests:

```bash
npm test
```

Or run once without coverage:

```bash
npm run test:run
```

## Notes

- The app uses JWTs for secure route access.
- Password reset tokens are cached in Redis and expire after a short window.
- Validation is enforced using Zod schemas.
- The project is best suited for personal finance or budgeting workflows.
