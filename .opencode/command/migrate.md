---
description: Create a new EF Core migration
---

Create a new Entity Framework Core migration.

## Usage

```
/migrate <MigrationName>
```

Example: `/migrate AddUserPreferences`

## Migration Command

Run the following command to create the migration:

```bash
dotnet ef migrations add $ARGUMENTS \
  --project backend/FanEngagement.Infrastructure \
  --startup-project backend/FanEngagement.Api
```

## Instructions

1. After creating the migration, review the generated files in:
   `backend/FanEngagement.Infrastructure/Persistence/Migrations/`

2. Check the migration for:
   - Correct table/column names
   - Appropriate data types
   - Foreign key relationships
   - Index definitions
   - Default values

3. If the migration looks incorrect:
   - Delete the generated files
   - Fix the entity/configuration
   - Run the migration command again

## Applying Migrations

To apply the migration to the database:

```bash
dotnet ef database update \
  --project backend/FanEngagement.Infrastructure \
  --startup-project backend/FanEngagement.Api
```

## Common Issues

- **No changes detected**: Ensure your entity changes are properly configured in `DbContext`
- **Conflicting migrations**: Check for uncommitted migrations that might conflict
- **Connection error**: Ensure PostgreSQL is running (`docker compose up -d db`)

## Best Practices

- Use descriptive migration names (e.g., `AddUserEmailVerification`, `RemoveDeprecatedColumn`)
- Never modify existing migrations that have been applied to other environments
- Review generated SQL before applying to production
- Include migrations in the same PR as the model changes
