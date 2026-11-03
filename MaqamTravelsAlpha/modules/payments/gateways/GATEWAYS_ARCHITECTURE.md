# Payment Gateways Architecture

Production-grade multi-gateway payment integration supporting **Razorpay**, **PayPal**, and **PhonePe**.

## Directory Structure

```
modules/payments/
├── payment.model.js                   # Payment schema (Razorpay, PayPal, PhonePe fields)
├── payment.routes.js                  # Unified payment endpoint routing
├── payment.validator.js               # Common payment validator schemas
├── payment.service.js                 # Generic payments logic
├── payment.controller.js              # Generic API handlers
├── paymentGateway.js                  # Gateway selection factory router
│
└── gateways/                          # Multi-gateway implementations
    ├── razorpay/                      # Razorpay Gateway
    │   ├── razorpay.adapter.js        # Low-level REST API calls
    │   ├── razorpay.client.js         # Client interface facade
    │   ├── razorpay.service.js        # Razorpay orchestrator
    │   ├── razorpay.controller.js     # Express routes controller
    │   └── razorpay.webhook.js        # Signature validation webhooks
    │
    ├── paypal/                        # PayPal Gateway
    │   ├── paypal.adapter.js          # REST API + Auth token generator
    │   ├── paypal.client.js           # Client facade
    │   ├── paypal.service.js          # PayPal business logic
    │   ├── paypal.controller.js       # Express routes controller
    │   └── paypal.webhook.js          # IPN callback logic
    │
    └── phonepe/                       # PhonePe Gateway
        ├── phonepe.adapter.js         # Request payload & checksum builder
        ├── phonepe.client.js          # Client facade
        ├── phonepe.service.js         # PhonePe business logic
        ├── phonepe.controller.js      # Express routes controller
        └── phonepe.webhook.js         # S2S callback & checksum checker
```

## Architecture Pattern

### 1. **Adapter Layer** (`*adapter.js`)

- **Purpose**: Low-level API integration with payment provider
- **Responsibility**: API calls, signature verification, error handling
- **Single Responsibility**: If provider API changes, only adapter changes
- **No business logic** - just provider integration

```
razorpay.adapter.js:
- createOrder()
- verifyPaymentSignature()
- getPaymentDetails()
- capturePayment()
- refundPayment()
- createCustomer()
```

### 2. **Client Layer** (`*client.js`)

- **Purpose**: Organized facade/interface over adapter
- **Responsibility**: Group adapter methods into logical units
- **Benefits**:
  - Easy to mock for testing
  - Clean API for services to consume
  - Can add retry logic, request/response logging centrally

```
razorpay.client.js structure:
client.orders.create()
client.payments.verify()
client.payments.fetch()
client.customers.create()
```

### 3. **Service Layer** (`*service.js`)

- **Purpose**: Business logic and orchestration
- **Responsibility**:
  - Validate booking/user
  - Call adapter/client
  - Update database models
  - Coordinate with other services
- **Testability**: Easy to mock client and test business logic

```
razorpayService.createPaymentOrder()
  1. Validate user, booking, amount
  2. Call razorpayClient.orders.create()
  3. Create Payment record in DB
  4. Return order details to frontend
```

### 4. **Controller Layer** (`*controller.js`)

- **Purpose**: HTTP request/response handling
- **Responsibility**:
  - Extract data from request
  - Validate input (via express-validator)
  - Call service
  - Return response

```
razorpayController.createPaymentOrder()
  1. Validate request (validationResult)
  2. Extract userId, bookingId, bookingType
  3. Call razorpayService.createPaymentOrder()
  4. Return sendCreated() response
```

### 5. **Webhook Layer** (`*webhook.js`)

- **Purpose**: Handle asynchronous callbacks from payment provider
- **Responsibility**:
  - Verify webhook signature
  - Route event to appropriate handler
  - Update payment/booking status
  - Always return 200 (prevent retry storms)

```
razorpayWebhook:
  - Verify X-Razorpay-Signature
  - Route payment.captured → processSuccessfulPayment()
  - Route payment.failed → mark as failed
  - Always return 200 to acknowledge
```

## Gateway Factory Pattern

### `paymentGateway.js` - Dynamic Gateway Selection

```javascript
const gateway = require("./gateways/paymentGateway");

// Lazy loading - only loaded when needed
const razorpayGateway = gateway.getGateway("razorpay");
const { adapter, service, webhook } = razorpayGateway;

// Check available gateways
const available = gateway.getAvailableGateways(); // ['razorpay', ...]
```

**Benefits**:

- ✅ Supports multiple payment gateways
- ✅ Lazy loading (memory efficient)
- ✅ Easy to add new gateways
- ✅ Centralized gateway registry

## Razorpay Implementation (ACTIVE)

### Status: ✅ PRODUCTION READY

**Flow**:

1. Frontend calls `/api/v1/payments/razorpay/create-order`
2. Server creates Payment record + Razorpay order
3. Frontend redirects to Razorpay Checkout
4. User completes payment
5. Razorpay sends webhook to `/webhook/razorpay/events`
6. Server verifies signature, updates booking to "confirmed"
7. Calls GDS ticketing API
8. Sends notifications

**Key Features**:

- ✅ Signature verification (HMAC-SHA256)
- ✅ Partial refunds supported
- ✅ Webhook signature validation
- ✅ Test mode support (rzp*test*\* keys)

**Environment Variables**:

```
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxx
```

## PayPal Implementation (TEMPLATE READY)

### Status: 🟡 TEMPLATE - NOT IMPLEMENTED

**Flow**:

1. Frontend calls `/api/v1/payments/paypal/create-order`
2. Server creates Payment record + PayPal order
3. Frontend redirects to PayPal
4. User authorizes payment
5. PayPal returns to app
6. Frontend calls `/api/v1/payments/paypal/capture`
7. Server captures payment
8. Or: PayPal IPN callback to `/webhook/paypal/ipn`

**Files Ready**:

- ✅ paypal.adapter.js (stub)
- ✅ paypal.client.js (facade)
- ✅ paypal.service.js (business logic)
- ✅ paypal.webhook.js (IPN handler)
- 🔲 paypal.controller.js (TODO)

**TODO for Implementation**:

1. Fill paypal.adapter.js with PayPal REST API calls
2. Create paypal.controller.js endpoints
3. Update payment.routes.js to mount PayPal routes
4. Add PayPal env vars (.env)
5. Update payment.model.js with paypal\* fields

**Environment Variables Needed**:

```
PAYPAL_CLIENT_ID=xxxxx
PAYPAL_CLIENT_SECRET=xxxxx
PAYPAL_MODE=sandbox|production
```

## PhonePe Implementation (TEMPLATE READY)

### Status: 🟡 TEMPLATE - NOT IMPLEMENTED

**Flow**:

1. Frontend calls `/api/v1/payments/phonepe/create-payment`
2. Server creates Payment record + PhonePe payment request
3. Returns redirect URL
4. Frontend redirects to PhonePe/UPI
5. User completes UPI payment
6. PhonePe sends S2S callback to `/webhook/phonepe/callback`
7. Server verifies checksum, updates booking

**Files Ready**:

- ✅ phonepe.adapter.js (stub)
- ✅ phonepe.client.js (facade)
- ✅ phonepe.service.js (business logic)
- ✅ phonepe.webhook.js (callback handler)
- 🔲 phonepe.controller.js (TODO)

**TODO for Implementation**:

1. Fill phonepe.adapter.js with PhonePe API calls
2. Implement checksum verification in webhook
3. Create phonepe.controller.js endpoints
4. Update payment.routes.js to mount PhonePe routes
5. Add PhonePe env vars (.env)

**Environment Variables Needed**:

```
PHONEPE_MERCHANT_ID=xxxxx
PHONEPE_API_KEY=xxxxx
PHONEPE_SALT_KEY=xxxxx
PHONEPE_MODE=sandbox|production
```

## How to Add a New Gateway

### Step 1: Create Gateway Folder

```bash
mkdir modules/payments/gateways/newgateway
```

### Step 2: Copy Template Files

```
newgateway/
├── newgateway.adapter.js    (copy from razorpay/paypal/)
├── newgateway.client.js     (copy from razorpay/paypal/)
├── newgateway.service.js    (copy from razorpay/paypal/)
├── newgateway.controller.js (copy from razorpay/)
└── newgateway.webhook.js    (copy from razorpay/)
```

### Step 3: Update Gateway Factory

In `paymentGateway.js`, add to gateways registry:

```javascript
const gateways = {
    razorpay: { ... },
    paypal: { ... },
    phonepe: { ... },
    newgateway: {
        name: 'NewGateway',
        adapter: null,
        service: null,
        webhook: null,
    },
};

// In initializeGateway():
case 'newgateway':
    if (!gateway.adapter) {
        gateway.adapter = require('./newgateway/newgateway.adapter');
        gateway.service = require('./newgateway/newgateway.service');
        gateway.webhook = require('./newgateway/newgateway.webhook');
    }
    break;
```

### Step 4: Update Routes

In `payment.routes.js`, add gateway routes:

```javascript
const { newgatewayRouter } = require("./gateways/newgateway/newgateway.routes");
router.use("/newgateway", newgatewayRouter);
```

### Step 5: Implement API Integration

Fill in actual API calls in `newgateway.adapter.js`

### Step 6: Add Environment Variables

```
NEWGATEWAY_API_KEY=xxxxx
NEWGATEWAY_SECRET=xxxxx
```

## Payment Model Fields

```javascript
// Generic fields
userId; // User making payment
bookingId; // Which booking
bookingType; // 'flight', 'hotel', 'tour', 'package'
amount; // In INR
currency; // 'INR'
paymentMethod; // 'razorpay', 'paypal', 'phonepe'
status; // pending|paid|failed|refunded
createdAt; // Timestamp

// Razorpay fields
razorpayOrderId; // Order ID from Razorpay
razorpayPaymentId; // Payment ID after checkout
transactionId; // Payment ID

// PayPal fields
paypalOrderId; // Order ID from PayPal
paypalCaptureId; // Capture ID after authorization
paypalTransactionId; // Transaction ID

// PhonePe fields
phonePeTransactionId; // PhonePe transaction ID

// Refund fields
refundRefId; // Refund reference ID
refundAmount; // Amount refunded
refundReason; // Why refunded
refundProcessedAt; // When refund completed
```

## Migration Path: Razorpay → Multi-Gateway

### Phase 1: ✅ COMPLETE

- Razorpay fully implemented
- Payment model updated
- Routes working

### Phase 2: IN PROGRESS

- PayPal templates created
- PhonePe templates created
- Gateway factory pattern implemented

### Phase 3: TODO

- Implement PayPal adapter (API calls)
- Implement PhonePe adapter (API calls)
- Test PayPal and PhonePe flows
- Update frontend for gateway selection

### Phase 4: FUTURE

- Add Stripe
- Add Square
- Add Amazon Pay
- Add local Indian gateways

## Error Handling

Each layer handles specific errors:

**Adapter**: API errors from provider

```javascript
// Razorpay API call failed
throw new AppError("Razorpay API error", 500);
```

**Service**: Business logic errors

```javascript
// Booking already paid
throw new AppError("This booking is already paid", 400);
```

**Controller**: Request validation errors

```javascript
// Invalid input
sendBadRequest(res, "Validation failed", errors.array());
```

**Webhook**: Always return 200

```javascript
// Even on error, return 200
res.json({ success: false, error: error.message });
```

## Testing Strategy

### Unit Tests

- Mock `*client.js` → test `*service.js` business logic
- Mock `*adapter.js` → test `*client.js` organization
- Test `*adapter.js` against provider sandbox API

### Integration Tests

- Test end-to-end flow: Controller → Service → Adapter → DB
- Mock payment provider responses
- Verify Payment model updates

### Webhook Tests

- Verify signature validation
- Test event routing
- Test error recovery

## Performance Considerations

### Lazy Loading

Gateway adapters only loaded when needed:

```javascript
gateway.getGateway("razorpay"); // Loads razorpay.adapter, service, webhook
gateway.getGateway("paypal"); // Loads paypal.adapter, service, webhook
```

### Database Optimization

- Add index on `Payment.bookingId`
- Add index on `Payment.razorpayOrderId`
- Add index on `Payment.paypalOrderId`

### Caching

- Cache available gateways list (getAvailableGateways)
- Cache gateway configs

## Security

### Webhook Signature Verification

✅ All webhooks verify signature before processing

- Razorpay: HMAC-SHA256 with RAZORPAY_KEY_SECRET
- PayPal: IPN verification with PayPal API
- PhonePe: Checksum with PHONEPE_SALT_KEY

### Secret Management

- All secrets in `.env` (never commit)
- Never log sensitive data
- Use environment-specific configs

### CORS & Rate Limiting

- Webhook endpoints are public (no auth)
- Regular endpoints require authentication
- Rate limiting on webhook to prevent abuse

## Monitoring & Logging

All gateway operations logged with prefix:

```
[Razorpay] Creating order: booking_123
[PayPal] Capturing order: PPL_ORD_456
[PhonePe] Verifying callback: TXN_789
```

This makes logs easily filterable and helps debugging.

## Troubleshooting

### "Unknown gateway: xxx"

- Check gateway name is lowercase: 'razorpay' not 'Razorpay'
- Verify gateway folder exists
- Check initializeGateway() has case for this gateway

### "Failed to initialize gateway: xxx"

- Check all required files exist in gateway folder
- Check require() paths are correct
- Check env vars are set

### Webhook signature verification failed

- Verify webhook URL in provider dashboard
- Check RAZORPAY_KEY_SECRET is correct
- Verify request body wasn't modified

## References

- Razorpay: https://razorpay.com/docs/api/orders/
- PayPal: https://developer.paypal.com/docs/checkout/
- PhonePe: https://www.phonepe.com/developer/
