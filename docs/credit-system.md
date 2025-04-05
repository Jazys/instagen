# Monthly Credit System Implementation

This document explains the implementation of the monthly credit system for the Instagen application using Next.js and Supabase.

## Overview

Each user receives 100 credits at the beginning of each month. These credits are used to perform various actions within the application. When a user's credits are exhausted, they must wait until the next month for their quota to reset.

## Database Schema

The system uses two main tables in Supabase:

### 1. user_quotas Table

This table tracks the credit quota for each user:

```sql
CREATE TABLE public.user_quotas (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_remaining INTEGER NOT NULL DEFAULT 100,
  last_reset_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  next_reset_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### 2. credits_usage_logs Table

This table records each credit usage action:

```sql
CREATE TABLE public.credits_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  credits_used INTEGER NOT NULL,
  credits_remaining INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

## Automatic Triggers and Functions

The system uses PostgreSQL triggers and functions to automate credit management:

### 1. New User Trigger

When a new user signs up, a record is automatically created in the `user_quotas` table with the default 100 credits:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_quotas (user_id, credits_remaining, last_reset_date, next_reset_date)
  VALUES (new.id, 100, now(), (date_trunc('month', now()) + interval '1 month'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2. Monthly Reset Trigger

When a user's quota record is accessed, the system checks if it's time to reset their credits:

```sql
CREATE OR REPLACE FUNCTION public.reset_monthly_quotas()
RETURNS TRIGGER AS $$
DECLARE
  current_time TIMESTAMP WITH TIME ZONE := now();
BEGIN
  -- Only reset if we've passed the next_reset_date
  IF current_time >= NEW.next_reset_date THEN
    NEW.credits_remaining := 100; -- Reset to default quota
    NEW.last_reset_date := current_time;
    NEW.next_reset_date := date_trunc('month', current_time) + interval '1 month';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_quota_reset
  BEFORE UPDATE ON public.user_quotas
  FOR EACH ROW EXECUTE FUNCTION public.reset_monthly_quotas();
```

### 3. Credits Usage Function

A dedicated PostgreSQL function handles credit consumption safely:

```sql
CREATE OR REPLACE FUNCTION public.use_credits(
  p_user_id UUID, 
  p_action_type TEXT, 
  p_credits_to_use INTEGER
)
RETURNS JSONB AS $$
-- Function body (see migration file for full implementation)
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## API Endpoints

The system exposes two primary API endpoints:

### 1. `/api/credits/quota`

Gets the current quota status for the authenticated user:
- Returns credits remaining
- Date of next reset
- Optional usage logs

### 2. `/api/credits/use`

Consumes credits for a specific action:
- Checks if sufficient credits are available
- Deducts credits if available
- Returns updated quota information

## Frontend Implementation

### 1. Credits Hook (`useCredits`)

A React hook that provides:
- Current credit status
- Methods to consume credits
- Real-time updates after credit usage

### 2. CreditsDisplay Component

A reusable component that:
- Shows credits remaining
- Displays next reset date
- Shows credit usage history
- Provides an interface to test credit consumption

## Implementation Details

### Security

- Row-Level Security (RLS) policies ensure users can only access their own quota data
- Server-side validation prevents credit consumption beyond available limits
- Functions run with `SECURITY DEFINER` to ensure consistent application of rules

### Performance Considerations

- Database triggers minimize round-trips for common operations
- Credits are checked and consumed in a single database call
- Optimistic UI updates improve perceived performance

### Error Handling

- Comprehensive error handling in both the database and application layers
- Detailed error messages guide the user when credit limits are reached
- Transaction-based operations ensure data consistency

## Integration Points

To integrate with other parts of the application:

1. **API Actions**: When an action requires credits, make a call to `/api/credits/use` first
2. **Dashboard**: Include the `CreditsDisplay` component in user dashboard
3. **Upgrade Flow**: Direct users with insufficient credits to upgrade options
4. **External API Integration**: For external systems, utilize the API endpoint at `/api/credits/external_call_use_token` using an API key (see documentation at `/docs/external-api-usage.md`)

## Deployment Considerations

1. **Database Migrations**: Run the SQL migrations to set up tables and triggers
2. **Supabase Setup**: Ensure Row-Level Security policies are correctly applied
3. **Environment Variables**: Make sure Supabase connection details are configured

## Testing

Test the implementation with:

1. **Credit consumption**: Try consuming different amounts of credits
2. **Month transition**: Test what happens during a month transition
3. **Concurrent requests**: Ensure credits are managed correctly under load

## Credit Action Button

The project includes a reusable component for testing credit consumption. This button can be found at `src/components/credit-action-button.tsx` and provides a simple way to deduct credits when users perform actions.

### Usage

```tsx
import CreditActionButton from '@/components/credit-action-button';

export default function MyComponent() {
  // Handle successful credit usage
  const handleSuccess = (creditsRemaining: number) => {
    console.log(`Action completed! Credits remaining: ${creditsRemaining}`);
  };

  return (
    <CreditActionButton 
      actionType="my_feature"
      onSuccess={handleSuccess}
      variant="default"  // optional UI variant
      size="default"     // optional size
    >
      Perform Action (-1 Credit)
    </CreditActionButton>
  );
}
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `actionType` | `string` | Identifier for the type of action being performed (default: "test_action") |
| `onSuccess` | `(creditsRemaining: number) => void` | Callback when credits are successfully used |
| `onError` | `(error: any) => void` | Callback when an error occurs |
| `variant` | `'default' \| 'destructive' \| 'outline' \| 'secondary' \| 'ghost' \| 'link'` | Button variant (default: "default") |
| `size` | `'default' \| 'sm' \| 'lg' \| 'icon'` | Button size (default: "default") |
| `className` | `string` | Additional CSS classes |
| `children` | `React.ReactNode` | Button content (default: "Use 1 Credit") |

### Demo Page

A demo page is available at `/demo/credit-action` to showcase the credit action button functionality. The page displays:

1. The user's current credit balance
2. Test buttons that consume credits
3. Explanations of how the credit system works

To access this demo, navigate to: [http://localhost:3000/demo/credit-action](http://localhost:3000/demo/credit-action)

## API Endpoints

### POST /api/credits/use-credit

This endpoint allows consuming credits for specific actions. It handles:

- Authentication verification
- Credit balance checking
- Deducting credits
- Logging usage

**Request:**

```json
{
  "actionType": "feature_name" // Optional, defaults to "test_action"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Successfully used 1 credit",
  "credits_remaining": 42
}
```

**Insufficient Credits Response (402):**

```json
{
  "error": "Insufficient credits",
  "credits_remaining": 0,
  "credits_required": 1
}
```

**Authorization Header:**

The endpoint requires a valid JWT token:
```
Authorization: Bearer {user_jwt_token}
``` 