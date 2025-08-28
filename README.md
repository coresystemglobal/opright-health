# Hospital Management System

A comprehensive hospital management system with patient management, appointment scheduling, billing, and payment processing.

## Payment Integration

The system supports multiple payment processors:

### Supported Payment Providers

1. **Stripe**
   - Credit/debit card payments
   - Webhook support for payment status updates
   - Refund processing

2. **Paystack**
   - Credit/debit card payments
   - Bank transfers
   - USSD payments
   - Webhook support for payment status updates
   - Refund processing

3. **Flutterwave**
   - Credit/debit card payments
   - Bank transfers
   - Mobile money
   - Webhook support for payment status updates
   - Refund processing

### Configuration

To use the payment processors, add the following environment variables to your `.env` file:

```
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret

# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key
PAYSTACK_CALLBACK_URL=http://your-domain.com/verify-payment

# Flutterwave Configuration
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-your_flutterwave_secret_key
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-your_flutterwave_public_key
FLUTTERWAVE_REDIRECT_URL=http://your-domain.com/verify-payment
FLUTTERWAVE_WEBHOOK_HASH=your_flutterwave_webhook_hash
```

### Payment Flow

1. **Initiate Payment**
   - Endpoint: `POST /api/payments/initiate`
   - Request body:
     ```json
     {
       "amount": 5000,
       "email": "patient@example.com",
       "currency": "NGN",
       "payment_provider": "stripe", // or "paystack", "flutterwave"
       "payment_method": "credit_card" // from PaymentMethod enum
     }
     ```

2. **Verify Payment**
   - Endpoint: `GET /api/payments/verify/:reference`
   - Response includes payment status and details

3. **Webhook Integration**
   - Stripe: `POST /api/payments/webhook/stripe`
   - Paystack: `POST /api/payments/webhook/paystack`
   - Flutterwave: `POST /api/payments/webhook/flutterwave`
   
4. **Process Refunds**
   - Endpoint: `POST /api/payments/refund/:paymentId`
   - Request body:
     ```json
     {
       "amount": 5000, // Optional. If not provided, full refund
       "reason": "Patient requested refund" // Optional
     }
     ```

### Testing Payments

For testing, use the following test cards:

**Stripe Test Card**
- Card Number: 4242 4242 4242 4242
- Expiry: Any future date
- CVV: Any 3 digits

**Paystack Test Card**
- Card Number: 4084 0840 8408 4081
- Expiry: Any future date
- CVV: Any 3 digits

**Flutterwave Test Card**
- Card Number: 5531 8866 5214 2950
- Expiry: 09/32
- CVV: 564
- PIN: 3310
- OTP: 12345

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (copy `.env.example` to `.env` and fill in values)
4. Run database migrations: `npm run migrate`
5. Start the server: `npm run dev`

## Testing

The project includes unit tests for all payment processors:

```
npm test
```

To run tests for just the payment services:

```
npm test -- src/tests/services/payment
```

## API Documentation

API documentation is available at `/api-docs` when the server is running.