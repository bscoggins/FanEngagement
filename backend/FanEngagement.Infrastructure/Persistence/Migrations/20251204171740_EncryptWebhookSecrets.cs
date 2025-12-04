using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FanEngagement.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class EncryptWebhookSecrets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Step 1: Add the new EncryptedSecret column (nullable temporarily)
            migrationBuilder.AddColumn<string>(
                name: "EncryptedSecret",
                table: "WebhookEndpoints",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            // Step 2: Migrate existing plaintext secrets to encrypted format
            // Note: This SQL uses a placeholder encryption. The application will handle
            // re-encrypting these values on first access or you should run a separate
            // data migration script with the actual encryption key.
            // For safety, we'll mark these as needing re-encryption by using a special prefix.
            migrationBuilder.Sql(@"
                UPDATE ""WebhookEndpoints""
                SET ""EncryptedSecret"" = 'NEEDS_ENCRYPTION:' || ""Secret""
                WHERE ""EncryptedSecret"" IS NULL;
            ");

            // Step 3: Make EncryptedSecret non-nullable
            migrationBuilder.AlterColumn<string>(
                name: "EncryptedSecret",
                table: "WebhookEndpoints",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(1000)",
                oldMaxLength: 1000,
                oldNullable: true);

            // Step 4: Drop the old Secret column
            migrationBuilder.DropColumn(
                name: "Secret",
                table: "WebhookEndpoints");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Rollback: Add Secret column back
            migrationBuilder.AddColumn<string>(
                name: "Secret",
                table: "WebhookEndpoints",
                type: "character varying(512)",
                maxLength: 512,
                nullable: true);

            // Copy data back (this will fail if secrets were encrypted, but provides a path)
            migrationBuilder.Sql(@"
                UPDATE ""WebhookEndpoints""
                SET ""Secret"" = REPLACE(""EncryptedSecret"", 'NEEDS_ENCRYPTION:', '')
                WHERE ""EncryptedSecret"" LIKE 'NEEDS_ENCRYPTION:%';
            ");

            // Make Secret non-nullable
            migrationBuilder.AlterColumn<string>(
                name: "Secret",
                table: "WebhookEndpoints",
                type: "character varying(512)",
                maxLength: 512,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(512)",
                oldMaxLength: 512,
                oldNullable: true);

            // Drop EncryptedSecret column
            migrationBuilder.DropColumn(
                name: "EncryptedSecret",
                table: "WebhookEndpoints");
        }
    }
}
