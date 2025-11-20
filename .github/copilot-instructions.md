# GitHub Copilot Chat Instructions — FanEngagement

This file provides context and guidelines for GitHub Copilot Chat when assisting with the FanEngagement application in VS Code.

## Guardrails for Chat Interactions
- When I request changes, always propose a plan before modifying existing files.
- Never delete code unless explicitly instructed.
- Never introduce new external dependencies without justification.

## Project Overview

FanEngagement is a .NET 9 ASP.NET Core Web API with a PostgreSQL database and a React + TypeScript frontend, designed for fan engagement and organization management with share-based voting capabilities.

### Architecture

- **API Layer** (`backend/FanEngagement.Api`): ASP.NET Core controllers, HTTP endpoints, OpenAPI
- **Application Layer** (`backend/FanEngagement.Application`): Service interfaces, DTOs, request/response models
- **Domain Layer** (`backend/FanEngagement.Domain`): Entities, enums, business logic primitives
- **Infrastructure Layer** (`backend/FanEngagement.Infrastructure`): EF Core DbContext, migrations, service implementations
- **Frontend** (`frontend/`): React 19 + TypeScript app (Vite dev, Nginx in production)
- **Tests** (`backend/FanEngagement.Tests`, `frontend/`): xUnit for backend; Vitest + Testing Library for frontend

### Tech Stack

- Runtime: .NET 9 (`net9.0`) backend; Node 20 for frontend build
- Database: PostgreSQL 16 via EF Core with Npgsql
- Testing: xUnit with integration tests (backend), Vitest + Testing Library (frontend)
- Container orchestration: Docker Compose
- API Documentation: OpenAPI (Development mode)

### Database

- Provider: PostgreSQL 16
- ORM: Entity Framework Core with Npgsql
- Migrations: Located in `backend/FanEngagement.Infrastructure/Persistence/Migrations`
- Auto-apply: Migrations run automatically on API startup
- Connection string: Configured via `appsettings.json` or environment variable `ConnectionStrings__DefaultConnection`

### Frontend

- Framework: React 19 + TypeScript
- Build tool: Vite 7
- Router: React Router v7
- API client: Axios with JWT via `Authorization: Bearer <token>`
- Auth: `AuthContext` persists token/user in `localStorage`; login via `POST /auth/login`
- Env: `VITE_API_BASE_URL` controls API base URL. Default is `/api` (same-origin). For bare dotnet development with Vite dev server, the proxy automatically forwards `/api` requests to `http://localhost:5049`. To bypass the proxy, set `VITE_API_BASE_URL=http://localhost:5049`. With Docker Compose, use `/api` (same-origin).

### Security & JWT Configuration

- The API requires `Jwt:Issuer`, `Jwt:Audience`, and a non-empty `Jwt:SigningKey`.
- In development (bare dotnet) `appsettings.Development.json` provides a sample key; replace before production.
- For Docker Compose, set environment variables (`Jwt__Issuer`, `Jwt__Audience`, `Jwt__SigningKey`). A placeholder is included; override with a strong secret via `.env` or CI secret store:
    - Example `.env` entry: `JWT_SIGNING_KEY=$(openssl rand -base64 64)`
- Never commit production secrets. Rotate keys periodically.
 - Startup will throw if Issuer, Audience, or SigningKey are missing/empty (validated in `Program.cs`).
 - In Development an initial admin user (`admin@example.com`) is auto-created or elevated to Admin role; change this in real environments.
 - CORS defaults to allowing `http://localhost:3000` and `http://localhost:5173` when `Cors:AllowedOrigins` is not configured.

## Development Environment

### Running the Application

**Preferred method (Docker Compose):**
```bash
# Start API + DB + Frontend
docker compose up --build

# API available at http://localhost:8080
# Frontend available at http://localhost:3000
```

**Alternative (bare dotnet):**
```bash
# Requires Postgres running on localhost:5432
dotnet run --project backend/FanEngagement.Api/FanEngagement.Api.csproj --launch-profile http

# API available at http://localhost:5049
```

**Frontend (bare Vite dev server):**
```bash
cd frontend
npm ci
echo "VITE_API_BASE_URL=http://localhost:5049" > .env.development
npm run dev

# Frontend available at http://localhost:5173
```

### Running Tests

**Docker Compose (recommended):**
```bash
docker compose up -d db
docker compose run --rm tests dotnet test backend/FanEngagement.Tests/FanEngagement.Tests.csproj --configuration Release
docker compose down -v
```

**Bare dotnet:**
```bash
dotnet test backend/FanEngagement.Tests/FanEngagement.Tests.csproj --configuration Release
```

**Frontend (Vitest):**
```bash
cd frontend
npm ci
npm test           # or: npm run test:watch
```

### Building

```bash
# Restore dependencies
dotnet restore backend/FanEngagement.sln

# Build solution
dotnet build backend/FanEngagement.sln --configuration Release

# Build frontend
cd frontend
npm ci
npm run build
```

## Code Organization Patterns

### Adding a New Feature

When implementing a new feature or endpoint:

1. **Define the domain entity** (if needed) in `backend/FanEngagement.Domain/Entities/`
2. **Create DTOs/requests** in `backend/FanEngagement.Application/<Feature>/`
3. **Define service interface** in `backend/FanEngagement.Application/<Feature>/I<Feature>Service.cs`
4. **Implement service** in `backend/FanEngagement.Infrastructure/Services/<Feature>Service.cs`
5. **Add controller** in `backend/FanEngagement.Api/Controllers/<Feature>Controller.cs`
6. **Register service** in `backend/FanEngagement.Infrastructure/DependencyInjection.cs`
7. **Configure EF mapping** (if needed) in `backend/FanEngagement.Infrastructure/Persistence/Configurations/`
8. **Add migration** (if schema changes) via `dotnet ef migrations add`
9. **Write tests** in `backend/FanEngagement.Tests/`

### Frontend Patterns

- **Routes**: Add to `frontend/src/routes/` and corresponding page components in `frontend/src/pages/`.
- **API clients**: Add/update service modules in `frontend/src/api/` using the shared `apiClient`.
- **Auth**: Use `AuthContext` and `ProtectedRoute` for protected pages.
- **Env**: Ensure `VITE_API_BASE_URL` points to the correct API for your environment.

### Current Entities

- `Organization`: Top-level organization entity
- `OrganizationMembership`: User membership in organizations with roles
- `User`: User/member entity
- `ShareType`: Type of shares issued by organization
- `ShareBalance`: User's balance of a specific share type
- `ShareIssuance`: Record of share issuance events
- `Proposal`: Governance proposals for voting
- `ProposalOption`: Options within a proposal
- `Vote`: User votes on proposals
- `OutboundEvent`: Event queue for webhooks
- `WebhookEndpoint`: Webhook endpoint configuration

### Current API Endpoints

- Health:
    - `GET /health` → Health check
- Auth & Users:
    - `POST /auth/login` → JWT login
    - `POST /users` → Create user
    - `GET /users` → List users
    - `GET /users/{id}` → Get user by ID
    - `PUT /users/{id}` → Update user
    - `DELETE /users/{id}` → Delete user
- Organizations & Memberships:
    - `POST /organizations` → Create organization
    - `GET /organizations` → List organizations
    - `GET /organizations/{id}` → Get organization by ID
    - `GET /organizations/{organizationId}/memberships` → List memberships
    - `POST /organizations/{organizationId}/memberships` → Add membership
    - `GET /organizations/{organizationId}/memberships/{userId}` → Get membership by user
    - `DELETE /organizations/{organizationId}/memberships/{userId}` → Remove membership
- Share Types & Issuances:
    - `POST /organizations/{organizationId}/share-types` → Create share type
    - `GET /organizations/{organizationId}/share-types` → List share types
    - `POST /organizations/{organizationId}/share-issuances` → Create share issuance
    - `GET /organizations/{organizationId}/share-issuances` → List share issuances
    - `GET /organizations/{organizationId}/users/{userId}/share-issuances` → List user share issuances
    - `GET /organizations/{organizationId}/users/{userId}/balances` → Get user share balances
- Proposals & Voting:
    - `POST /organizations/{organizationId}/proposals` → Create proposal
    - `GET /organizations/{organizationId}/proposals` → List proposals by organization
    - `GET /proposals/{proposalId}` → Get proposal by ID
    - `PUT /proposals/{proposalId}` → Update proposal
    - `POST /proposals/{proposalId}/close` → Close proposal
    - `POST /proposals/{proposalId}/options` → Add proposal option
    - `DELETE /proposals/{proposalId}/options/{optionId}` → Delete proposal option
    - `POST /proposals/{proposalId}/votes` → Cast vote
    - `GET /proposals/{proposalId}/results` → Get results
- Webhooks & Outbound Events:
    - `POST /organizations/{organizationId}/webhooks` → Create webhook endpoint
    - `GET /organizations/{organizationId}/webhooks` → List webhook endpoints
    - `GET /organizations/{organizationId}/webhooks/{webhookId}` → Get webhook endpoint
    - `PUT /organizations/{organizationId}/webhooks/{webhookId}` → Update webhook endpoint
    - `DELETE /organizations/{organizationId}/webhooks/{webhookId}` → Delete webhook endpoint
    - `GET /organizations/{organizationId}/outbound-events` → List outbound events (filter by status/type)
    - `GET /organizations/{organizationId}/outbound-events/{eventId}` → Get outbound event details
    - `POST /organizations/{organizationId}/outbound-events/{eventId}/retry` → Retry outbound event
 - Admin & Dev Utilities:
     - `POST /admin/seed-dev-data` → Seed development data (Development only, Admin role required)
     - `GET /users/admin/stats` → Basic user statistics (Admin role required)

## Coding Conventions

### General Style

- **Controllers**: Thin controllers; delegate business logic to services
- **Async/await**: Use async APIs throughout; pass `CancellationToken` to all async methods
- **Dependency injection**: Constructor injection with primary constructors where appropriate
- **Naming**: PascalCase for types/public members, camelCase for parameters/locals, pluralize collections
- **Return types**: Use `ActionResult<T>` or `ActionResult` for controller actions
- **HTTP status codes**: Return semantically correct codes (`201 Created`, `404 NotFound`, `204 NoContent`, etc.)

### Entity Configuration

- Use Fluent API configuration in separate files under `Persistence/Configurations/`
- Configure relationships, indexes, and constraints explicitly
- Use value converters for enums when needed

### Testing

- Use `WebApplicationFactory<Program>` for integration tests
- Inject `ITestOutputHelper` to log debugging information
- Test both success and error paths
- Keep tests focused and deterministic
- Avoid excessive mocking; prefer integration tests with real database

### Error Handling

- Return appropriate HTTP status codes from controllers
- Log errors appropriately (use `ILogger<T>`)
- Avoid exposing internal details in production error responses

## Database Migrations

### Creating Migrations

```bash
# Install EF tools if needed
dotnet tool install --global dotnet-ef

# Add migration
dotnet ef migrations add <MigrationName> \
  --project backend/FanEngagement.Infrastructure/FanEngagement.Infrastructure.csproj \
  --startup-project backend/FanEngagement.Api/FanEngagement.Api.csproj

# Apply migration locally
dotnet ef database update \
  --project backend/FanEngagement.Infrastructure/FanEngagement.Infrastructure.csproj \
  --startup-project backend/FanEngagement.Api/FanEngagement.Api.csproj
```

### Migration Guidelines

- Include descriptive migration names (e.g., `AddProposalVotingTables`)
- Review generated migration code before committing
- Test migrations both up and down
- Migrations apply automatically on API startup

## Common Tasks

### Adding a New Controller Endpoint

1. Add action method to existing controller or create new controller
2. Use appropriate HTTP verb attribute (`[HttpGet]`, `[HttpPost]`, etc.)
3. Define route with `[Route]` attribute
4. Accept `CancellationToken` as last parameter
5. Call service layer method
6. Return appropriate `ActionResult`

### Adding a New Service Method

1. Add method signature to service interface in `Application/`
2. Implement method in service class in `Infrastructure/Services/`
3. Use dependency-injected `FanEngagementDbContext` for data access
4. Make method async and accept `CancellationToken`
5. Handle not-found cases appropriately (return null or throw)

### Modifying an Entity

1. Update entity class in `Domain/Entities/`
2. Update EF configuration in `Infrastructure/Persistence/Configurations/` if needed
3. Generate migration with `dotnet ef migrations add`
4. Review and test migration
5. Update related DTOs, services, and tests

## Troubleshooting

### Common Issues

- **Port conflicts**: API uses 8080 (Docker) or 5049 (dotnet); ensure ports are free
- **Database connection**: Ensure Postgres is running and connection string is correct
- **Migration errors**: Check `ConnectionStrings__DefaultConnection` and ensure database is accessible
- **Test failures**: Ensure database service is healthy before running tests

### Debugging

- Set breakpoints in controllers or services
- Use `ITestOutputHelper` in tests to log details
- Check Docker logs: `docker compose logs api` or `docker compose logs db`
- Inspect container: `docker exec -it fanengagement-db psql -U fanengagement`
- Frontend dev: run `npm run dev` in `frontend/`, check browser console/network

## CI/CD

- CI runs on push and PR to `main`
- Workflow: `.github/workflows/ci.yml`
- Uses Docker Compose to run tests against Postgres
- Uploads test results as artifacts

Note: Frontend builds as a static site in the `frontend` container (Nginx). Frontend tests run locally (`npm test` in `frontend/`).

## When Suggesting Code

- **Follow existing patterns**: Review similar existing code before suggesting new implementations
- **Include all necessary using statements**: Don't omit namespaces
- **Use primary constructors**: For simple DI scenarios (C# 12 feature)
- **Pass CancellationToken**: All async methods should accept and pass `CancellationToken`
- **Write tests**: Suggest corresponding test code when adding features
- **Consider migrations**: Remind user to create migration if entity schema changes
- **Use appropriate status codes**: REST APIs should return semantically correct HTTP codes
- **Handle nulls**: Use nullable reference types correctly
- **Register services**: Remind user to register new services in `DependencyInjection.cs`

## Example Implementations

### Example Controller Action

```csharp
[HttpGet("{id:guid}")]
public async Task<ActionResult<OrganizationDto>> GetById(Guid id, CancellationToken cancellationToken)
{
    var organization = await _organizationService.GetByIdAsync(id, cancellationToken);
    if (organization is null)
    {
        return NotFound();
    }
    return Ok(organization);
}
```

### Example Service Method

```csharp
public async Task<Organization?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
{
    return await _context.Organizations
        .Include(o => o.Members)
        .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
}
```

### Example Integration Test

```csharp
[Fact]
public async Task GetOrganizationById_ReturnsOrganization_WhenExists()
{
    // Arrange
    var createResponse = await _client.PostAsJsonAsync("/organizations", 
        new CreateOrganizationRequest("Test Org"));
    var created = await createResponse.Content.ReadFromJsonAsync<OrganizationDto>();

    // Act
    var response = await _client.GetAsync($"/organizations/{created!.Id}");

    // Assert
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    var org = await response.Content.ReadFromJsonAsync<OrganizationDto>();
    Assert.NotNull(org);
    Assert.Equal("Test Org", org!.Name);
}
```

## Additional Resources

- Solution file: `backend/FanEngagement.sln`
- Docker Compose: `docker-compose.yml`
- Architecture docs: `docs/architecture.md`
- Coding agent guide: `.github/copilot-coding-agent-instructions.md`

---
This instruction file helps GitHub Copilot Chat provide contextually relevant, accurate suggestions for the FanEngagement codebase.
