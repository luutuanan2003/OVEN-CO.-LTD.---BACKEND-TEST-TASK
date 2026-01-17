# Webhook Receiver Service

A production-ready webhook receiver service built with NestJS, featuring input validation, signature verification, rate limiting, and comprehensive error handling.

## Features

- **Input Validation** - All incoming data validated using class-validator
- **Signature Verification** - HMAC-SHA256 webhook signature verification
- **Rate Limiting** - Configurable rate limiting per IP address
- **Security Headers** - Helmet middleware for security headers
- **Pagination** - Efficient paginated listing of webhooks
- **Filtering** - Filter webhooks by source and event type
- **Logging** - Structured logging for all operations
- **Unit Tests** - Comprehensive test coverage

## Prerequisites

- Node.js 18+
- npm or yarn

# Install dependencies
npm install
```

## Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Security
WEBHOOK_SECRET=your-webhook-secret-here
CORS_ORIGIN=*

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000

# Storage
MAX_WEBHOOKS_STORAGE=10000
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `WEBHOOK_SECRET` | Secret for signature verification | - |
| `CORS_ORIGIN` | Allowed CORS origins | `*` |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms | `60000` |
| `MAX_WEBHOOKS_STORAGE` | Max webhooks to store | `10000` |

## Running the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Run tests
npm test

# Run tests with coverage
npm run test:cov
```

## API Endpoints

All endpoints are prefixed with `/api/v1`

### Create Webhook

```http
POST /api/v1/webhooks
Content-Type: application/json
x-webhook-signature: <hmac-sha256-signature>

{
  "source": "stripe",
  "event": "payment.completed",
  "payload": {
    "amount": 1000,
    "currency": "usd"
  }
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Webhook received"
}
```

### List Webhooks

```http
GET /api/v1/webhooks?page=1&limit=10&source=stripe&event=payment.completed
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `source` - Filter by source
- `event` - Filter by event type

**Response:**
```json
{
  "webhooks": [...],
  "count": 10,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

### Get Webhook by ID

```http
GET /api/v1/webhooks/:id
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "source": "stripe",
  "event": "payment.completed",
  "payload": {...},
  "receivedAt": "2026-01-17T12:00:00.000Z",
  "verified": true
}
```

### Delete Webhook

```http
DELETE /api/v1/webhooks/:id
```

**Response:**
```json
{
  "message": "Webhook deleted successfully"
}
```

## Webhook Signature Verification

To verify webhooks, set the `WEBHOOK_SECRET` environment variable and include the signature in the `x-webhook-signature` header.

### Generating a Signature

```javascript
const crypto = require('crypto');

const payload = JSON.stringify({
  source: 'stripe',
  event: 'payment.completed',
  payload: { amount: 1000 }
});

const signature = crypto
  .createHmac('sha256', 'your-webhook-secret')
  .update(payload)
  .digest('hex');

// Use this signature in the x-webhook-signature header
```

## Project Structure

```
src/
├── common/
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── guards/
│   │   └── rate-limit.guard.ts
│   └── interceptors/
│       └── logging.interceptor.ts
├── webhooks/
│   ├── dto/
│   │   ├── create-webhook.dto.ts
│   │   └── query-webhooks.dto.ts
│   ├── interfaces/
│   │   └── webhook.interface.ts
│   ├── webhooks.controller.ts
│   ├── webhooks.controller.spec.ts
│   ├── webhooks.module.ts
│   ├── webhooks.service.ts
│   ├── webhooks.service.spec.ts
│   ├── webhooks.storage.ts
│   └── webhooks.storage.spec.ts
├── app.module.ts
└── main.ts
```

## Changes Made from Original Code

See [ANALYSIS.md](./ANALYSIS.md) for a detailed analysis of issues found and fixes implemented.

### Key Improvements

1. **Security**
   - Added input validation with DTOs
   - Implemented webhook signature verification
   - Added rate limiting
   - Added security headers with Helmet

2. **Reliability**
   - Replaced weak ID generation with UUID v4
   - Added global error handling
   - Implemented storage size limits

3. **Scalability**
   - Added pagination support
   - Changed from array to Map for O(1) lookups
   - Added filtering capabilities

4. **Code Quality**
   - Migrated to NestJS framework
   - Added comprehensive unit tests
   - Structured logging
   - TypeScript strict mode

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov
```

## License

MIT
