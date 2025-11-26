# FanEngagement Frontend

This directory contains the React + TypeScript frontend for the FanEngagement platform. It interacts with the ASP.NET Core backend API to provide organization management, share-based voting, and member engagement features.

## Overview

- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite
- **Router:** React Router v7
- **API Client:** Axios with JWT authentication
- **Testing:** Vitest + Testing Library
- **Authentication:** JWT-based, stored in localStorage, sent via `Authorization: Bearer` header

## Available Scripts

- `npm run dev` — Start development server (default: http://localhost:5173)
- `npm run build` — Build for production
- `npm run preview` — Preview production build
- `npm run test` — Run tests
- `npm run test:watch` — Run tests in watch mode
- `npm run lint` — Run ESLint
- `npm run e2e` — Run headless Playwright E2E tests (requires backend + DB running)
- `npm run e2e:dev` — Run Playwright E2E tests in UI mode

## Environment Configuration

- Create `.env.development` (or `.env.local`) in this directory.
- Set the API base URL:

  ```
  VITE_API_BASE_URL=http://localhost:5049
  ```

- The frontend expects the backend API to be running and accessible at this URL.

## Project Structure

```
src/
  api/         # API client and service modules (authApi, usersApi)
  auth/        # Authentication context with login/logout and localStorage persistence
  components/  # Reusable UI components (Layout)
  pages/       # Route-level pages (Home, Login, Users, UserEdit)
  routes/      # React Router configuration
  types/       # TypeScript interfaces for API models
  test/        # Test setup files
```

## Authentication

- Users log in via the `/login` page, which sends credentials to the backend API at `POST /auth/login`.
- On success, a JWT token is stored in `localStorage` and attached to all subsequent API requests.
- The `AuthContext` provides `useAuth()` hook for accessing authentication state and methods.
- Protected routes can check `isAuthenticated` and redirect to login if needed.

## Available Routes

- `/` — Home page with welcome message
- `/login` — Login page (placeholder, implementation pending)
- `/users` — Users list page (placeholder)
- `/users/:id/edit` — User edit page (placeholder)

## Development Workflow

1. Start backend API (see root README for instructions)
2. Set `VITE_API_BASE_URL` in `.env.development`
3. Run `npm install` then `npm run dev`
4. Access frontend at http://localhost:5173

### End-to-End Tests

- The Playwright suite lives in `frontend/e2e`.
- Ensure the backend and Postgres are running (Docker Compose or `dotnet run` on port 5049/8080) and set `VITE_API_BASE_URL` accordingly.
- Run `npm run e2e` for headless execution or `npm run e2e:dev` for interactive runs.
- A helper script at `scripts/run-e2e.sh` starts Docker Compose (db + api), waits for `/health/live`, and runs the suite with `VITE_API_BASE_URL=http://localhost:8080`.

## API Integration

The API client (`src/api/client.ts`) is configured to:
- Read the base URL from `VITE_API_BASE_URL` environment variable
- Automatically attach JWT tokens from localStorage as `Authorization: Bearer <token>` headers
- Provide type-safe API methods in separate service modules

## Testing

Tests are written with Vitest and Testing Library. Run tests with:

```bash
npm test          # Run once
npm run test:watch # Watch mode
```

## Notes

- The frontend expects the backend API to be running and accessible.
- If you change API endpoints, update the API client in `src/api/`.
- For new pages, add a route in `src/routes/` and a component in `src/pages/`.

For more details, see the root `README.md` and backend documentation.

## Developer Tools (Admin-only)

The Admin Dev Tools page provides convenient actions for development environments.

- Route: `/admin/dev-tools`
- Access: Admin users only (protected route)
- Environment: Actions are available only in non-production environments (Development/Demo) at the API level.

### Actions

- Seed Development Data
  - Calls `POST /admin/seed-dev-data`
  - Populates sample organizations, users, memberships, share types, issuances, proposals, and votes
  - Idempotent: running multiple times does not create duplicates

- Reset to Seed Data
  - Calls `POST /admin/reset-dev-data`
  - Deletes all organizations and non-admin users, then re-runs the original seed
  - Destructive: prompts for confirmation in the UI; gated by environment and Admin role

Notes:

- After successful E2E runs, the helper script triggers a cleanup endpoint to remove E2E-created organizations. Failures skip cleanup to preserve context for debugging.
- API endpoints are restricted by role and environment, and will return `403` outside of allowed environments.
