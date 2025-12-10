# Testing the Login Flow

This document describes how to test the implemented login flow and protected routes.

## Prerequisites

- Backend API running (via Docker or `dotnet run`)
- Frontend running (via Docker or `npm run dev`)

## Testing Locally

### 1. Start the Backend

```bash
cd backend
dotnet run --project FanEngagement.Api/FanEngagement.Api.csproj --launch-profile http
```

The API will be available at `http://localhost:5049`

### 2. Start the Frontend

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 3. Create a Test User

Use curl or any HTTP client to create a test user:

```bash
curl -X POST http://localhost:5049/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "displayName": "Test User"
  }'
```

### 4. Test the Login Flow

1. Navigate to `http://localhost:5173/login`
2. Enter the test user credentials:
   - Email: `test@example.com`
   - Password: `TestPassword123!`
3. Click "Log In"
4. You should be redirected to `/users` page
5. The header should display "Logged in as test@example.com" and a "Logout" button

### 5. Test Protected Routes

1. While logged in, navigate to `/users` - you should see the users page
2. Click "Logout" - you should be redirected to `/login`
3. Try to navigate to `/users` while logged out - you should be redirected to `/login`

### 6. Test Auto-redirect from Login

1. Log in successfully
2. Try to navigate to `/login` again
3. You should be automatically redirected to `/users`

## Testing with Docker Compose

### 1. Start All Services

```bash
docker compose up -d db api frontend
```

- Frontend: `http://localhost:3000`
- API: `http://localhost:8080`
- Database: `localhost:5432`

### 2. Create a Test User

```bash
curl -X POST http://localhost:8080/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "displayName": "Test User"
  }'
```

### 3. Test Login

Navigate to `http://localhost:3000/login` and follow the same steps as local testing.

## Running Tests

### Frontend Tests

```bash
cd frontend
npm test
```

### Backend Tests

```bash
cd backend
dotnet test
```

### End-to-End (Playwright) Expectations

Our Playwright suites exercise the experience exactly as users see it in the browser. When writing new e2e coverage:

- Drive all actions through the UI only (forms, buttons, navigation). Avoid calling the API or modifying storage directly from a test.
- Use the shared helpers in `frontend/e2e/utils.ts` to clear auth state and log in through the interface when needed.
- Rely on the `./scripts/run-e2e.sh` workflow (or `POST /admin/reset-dev-data`) to seed the database before tests start, rather than seeding inside the tests themselves.
- If a flow requires specific records, create them through the UI as part of the test scenario so the assertions reflect user-visible behavior.

## Test Scenarios Covered

### Login Page Tests

- ✅ Renders login form with email and password fields
- ✅ Successfully logs in with valid credentials
- ✅ Displays error message for invalid credentials (401)
- ✅ Displays error message for network errors
- ✅ Redirects to /users if already authenticated
- ✅ Disables submit button while logging in

### Protected Route Tests

- ✅ Redirects to /login when user is not authenticated
- ✅ Renders protected content when user is authenticated

### API Integration

- ✅ Authorization header is automatically attached to requests
- ✅ 401 responses trigger automatic logout and redirect to login
- ✅ Token and user info are persisted in localStorage
- ✅ Token and user info are loaded from localStorage on page refresh

## Expected Behavior

1. **Login Success**: User is redirected to `/users`, token is stored, header shows user email
2. **Login Failure**: Error message is displayed, user stays on login page
3. **Protected Routes**: Unauthenticated users are redirected to `/login`
4. **Logout**: User is redirected to `/login`, token is cleared
5. **401 Response**: User is automatically logged out and redirected to `/login`
6. **Already Logged In**: Visiting `/login` redirects to `/users`
