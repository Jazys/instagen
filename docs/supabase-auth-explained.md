# Supabase Authentication Flow Explained

This document explains the authentication system implemented in the application, which uses Supabase for authentication and session management. The authentication flow is managed through several key files:

1. `src/lib/auth.ts` - Core authentication utility functions
2. `src/middleware.ts` - Next.js middleware for route protection
3. `src/lib/api-middleware.ts` - API route protection middleware
4. Auth UI components in `src/pages/auth/`

## 1. Core Authentication System (`src/lib/auth.ts`)

The `auth.ts` file provides utility functions for handling authentication state, with a focus on maintaining sessions across page reloads and browser sessions.

### Key Components:

- **Storage Key Management**: Uses a consistent storage key (`sb-auth-token`) for storing session data in localStorage.
- **Multiple Session Sources**: Implements a fallback strategy to retrieve user sessions from:
  1. LocalStorage (fastest and most reliable for returning users)
  2. Supabase's built-in session management
  3. Session refresh as a last resort

### Main Functions:

```typescript
export async function getUser(): Promise<User | null>
export async function signOut(): Promise<void>
export async function getSession(): Promise<Session | null>
export async function getAccessToken(): Promise<string | null>
export function onAuthStateChange(callback: (user: User | null) => void)
```

### Session Persistence Strategy:

The system uses a combination of Supabase's built-in session management and manual localStorage management:

1. When a user signs in, the session is stored in localStorage
2. On authentication state changes, the listener updates localStorage
3. When accessing protected resources, the system first checks localStorage before making API calls

## 2. Route Protection (`src/middleware.ts`)

Next.js middleware that runs on every page request before rendering, providing route-based protection.

### Key Features:

- **Public Path Exclusions**: Automatically excludes static assets, API routes, and public pages from authentication checks
- **Protected Path Detection**: Identifies routes (like `/dashboard`) that require authentication
- **Redirection Logic**: 
  - Redirects unauthenticated users from protected pages to the login page
  - Redirects authenticated users away from auth pages to the dashboard
  - Includes anti-loop protection to prevent infinite redirects

### Configuration:

```typescript
// Paths that require authentication
const PROTECTED_PATHS = ['/dashboard']

// Auth-related paths
const AUTH_PATHS = ['/auth/login', '/auth/register']
```

### Middleware Flow:

1. Checks if the requested path should skip middleware (API routes, static files)
2. Creates a Supabase client using `createMiddlewareClient`
3. Retrieves and refreshes the user's session if possible
4. Enforces route protection based on session presence and requested path
5. Handles error states gracefully to prevent site breakage

## 3. API Route Protection (`src/lib/api-middleware.ts`)

Higher-order function that wraps API route handlers to enforce authentication for API endpoints.

### Usage Pattern:

```typescript
import { withAuth } from '@/lib/api-middleware';

export default withAuth(async (req, res, userId) => {
  // Your authenticated API logic here
  // userId is guaranteed to be valid
});
```

### Key Features:

- **Session Verification**: Verifies Supabase session before allowing API access
- **User ID Injection**: Provides the authenticated user's ID to the handler function
- **Error Standardization**: Returns consistent error responses for auth failures
- **Cookie Support**: Extracts the auth token from cookies for server-side API calls

## 4. Authentication UI Flow

The application implements a standard authentication UI flow with login and registration pages.

### Login Flow (`/auth/login`):

1. User enters credentials (email/password)
2. On form submission, the app:
   - Signs out any existing session for clean state
   - Attempts login via `supabase.auth.signInWithPassword`
   - Stores the session in localStorage on success
   - Redirects to the dashboard

### Registration Flow (`/auth/register`):

1. User provides registration details
2. On form submission, the app:
   - Creates account via `supabase.auth.signUp`
   - Creates additional profile data in Supabase tables
   - Shows email confirmation dialog
   - Stores session in localStorage if auto-signed in
   - Redirects to dashboard or shows confirmation message

### Email Verification:

The registration process includes email verification where required, with a confirmation dialog to guide users.

## 5. Session Usage in Components

Components can access the authenticated user through custom hooks like `useSession` (not shown in the provided files), which leverages the auth utilities to provide current user information.

## 6. Complete Authentication Flow

1. **Initial Access**:
   - Middleware checks for authentication on protected routes
   - Redirects unauthenticated users to login

2. **Login/Register**:
   - User authenticates via Supabase Auth
   - Session is stored in localStorage and with Supabase

3. **Subsequent Visits**:
   - Session is retrieved from localStorage first
   - Falls back to Supabase session management if needed
   - Session is refreshed automatically when expired

4. **API Access**:
   - API middleware verifies authentication for protected endpoints
   - User ID is provided to API handlers for authorization

5. **Logout**:
   - Clears session from localStorage and Supabase
   - Redirects to homepage

## 7. Security Considerations

- **Token Storage**: Sessions are stored in localStorage for persistence but with consistent key management
- **Error Handling**: Silent failure on parse errors prevents exposing sensitive information
- **Session Refresh**: Automatic session refresh maintains the user's authenticated state
- **Middleware Bypass**: Carefully excludes public paths to prevent unnecessary auth checks
- **Redirect Protection**: Implements loop detection to prevent infinite redirects

## 8. API Authentication Headers

For authenticated API requests, the application consistently uses:

```javascript
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
}
```

The access token is retrieved using the `getAccessToken()` function, which prioritizes localStorage for performance.

---

This authentication system provides a robust, secure way to manage user sessions while maintaining good performance through localStorage caching and strategic session refresh timing. 