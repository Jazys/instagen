# Testing Stripe Webhooks Locally

## Overview
This guide explains how to test your Stripe webhook integration locally using Postman with the development test mode enabled. This approach allows you to simulate Stripe webhook events without requiring actual Stripe signature verification.

## Prerequisites
- Your application running locally (typically on http://localhost:3000)
- [Postman](https://www.postman.com/downloads/) installed
- A valid user ID in your database to use for testing

## Setting Up a Test in Postman

### Step 1: Create a new request
1. Open Postman
2. Click the "+" button to create a new request
3. Set the request type to **POST**
4. Enter your webhook URL: `http://localhost:3000/api/stripe/webhook`

### Step 2: Configure Headers
Add the following headers:
- `Content-Type: application/json`
- `x-webhook-test: true` (This special header enables development testing mode)

### Step 3: Add the request body
1. Select the "Body" tab
2. Choose "raw" format
3. Select "JSON" from the dropdown
4. Paste the following JSON (modify as needed):

```json
{
  "id": "evt_test_webhook",
  "object": "event",
  "api_version": "2025-01-27",
  "created": 1675345022,
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_example123456",
      "object": "checkout.session",
      "client_reference_id": "YOUR_USER_ID_HERE",
      "metadata": {
        "credits": "300"
      },
      "customer": "cus_test123456",
      "payment_status": "paid"
    }
  }
}
```

**Important:** Replace `YOUR_USER_ID_HERE` with an actual user ID from your database.

### Step 4: Send the request
Click the "Send" button to submit the request.

## Expected Response
If successful, you should receive a response with status code `200` and a body containing:
```json
{
  "received": true
}
```

## Verifying the Results
After sending the request:

1. Check your application logs for confirmation:
   ```
   DEVELOPMENT MODE: Bypassing Stripe signature verification
   Using service client for Stripe webhook payment processing
   Successfully added 300 credits for user YOUR_USER_ID_HERE. New balance: XXX
   ```

2. Verify in your database that the user's credits have been updated.

## Troubleshooting

### Common Issues

1. **Request fails with 400 error**
   - Ensure your JSON is properly formatted
   - Verify that the `x-webhook-test` header is set correctly (check for typos)
   - Make sure your server is running in development mode

2. **Credits not added to user account**
   - Confirm that the `client_reference_id` matches a valid user ID in your system
   - Check your server logs for any database errors
   - Verify that the `credits` field in the metadata is a string (not a number)

3. **No response from server**
   - Ensure your local server is running
   - Check that the webhook URL is correct
   - Verify there are no network issues or firewall blocking the request

## Alternative Testing Methods

### Using cURL

You can also test webhooks using cURL:

```bash
curl -X POST http://localhost:3000/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-test: true" \
  -d '{
    "id": "evt_test_webhook",
    "object": "event",
    "api_version": "2025-01-27",
    "created": 1675345022,
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "id": "cs_test_example123456",
        "object": "checkout.session",
        "client_reference_id": "YOUR_USER_ID_HERE",
        "metadata": {
          "credits": "300"
        },
        "customer": "cus_test123456",
        "payment_status": "paid"
      }
    }
  }'
```

### For Windows PowerShell

```powershell
Invoke-WebRequest -Uri http://localhost:3000/api/stripe/webhook `
  -Method POST `
  -Headers @{
      "Content-Type"="application/json";
      "x-webhook-test"="true"
    } `
  -Body '{
    "id": "evt_test_webhook",
    "object": "event",
    "api_version": "2025-01-27",
    "created": 1675345022,
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "id": "cs_test_example123456",
        "object": "checkout.session",
        "client_reference_id": "YOUR_USER_ID_HERE",
        "metadata": {
          "credits": "300"
        },
        "customer": "cus_test123456",
        "payment_status": "paid"
      }
    }
  }'
```

### Using Stripe CLI (Recommended for Production)

For more realistic testing, use the Stripe CLI:

1. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Log in with your Stripe account:
   ```
   stripe login
   ```
3. Forward webhooks to your local server:
   ```
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
4. Trigger test events in another terminal:
   ```
   stripe trigger checkout.session.completed
   ```

## Security Notice

⚠️ **IMPORTANT:** This testing approach bypasses Stripe signature verification and should only be used in development environments. The `x-webhook-test` header should never be enabled in production code.

For production testing, use one of these recommended approaches:
- Stripe CLI for local testing with real signatures
- Stripe test webhooks from the Stripe Dashboard
- A proper webhook forwarding tool like ngrok with real Stripe events 