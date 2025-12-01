using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FanEngagement.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UpdateAuditEventsRelationshipsAndEnums : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Migrate existing enum values from old (starting at 1) to new (starting at 0)
            // AuditOutcome: Success=1->0, Failure=2->1, Denied=3->2, Partial=4->3
            migrationBuilder.Sql("UPDATE \"AuditEvents\" SET \"Outcome\" = \"Outcome\" - 1");

            // AuditActionType: Values in 1-9 range (lifecycle) need to shift by -1; values >= 10 stay the same
            migrationBuilder.Sql("UPDATE \"AuditEvents\" SET \"ActionType\" = \"ActionType\" - 1 WHERE \"ActionType\" < 10");

            // AuditResourceType: Values in 1-9 range (core entities) need to shift by -1; values >= 10 stay the same
            migrationBuilder.Sql("UPDATE \"AuditEvents\" SET \"ResourceType\" = \"ResourceType\" - 1 WHERE \"ResourceType\" < 10");

            // IMPORTANT: The enum value shifts above must happen before dropping and recreating the index below.
            // This ensures that the index filter matches the new enum values and maintains data consistency.
            migrationBuilder.DropIndex(
                name: "IX_AuditEvents_Outcome_Timestamp",
                table: "AuditEvents");

            migrationBuilder.CreateIndex(
                name: "IX_AuditEvents_Outcome_Timestamp",
                table: "AuditEvents",
                columns: new[] { "Outcome", "Timestamp" },
                descending: new[] { false, true },
                filter: "\"Outcome\" IN (1, 2)");

            migrationBuilder.AddForeignKey(
                name: "FK_AuditEvents_Organizations_OrganizationId",
                table: "AuditEvents",
                column: "OrganizationId",
                principalTable: "Organizations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_AuditEvents_Users_ActorUserId",
                table: "AuditEvents",
                column: "ActorUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AuditEvents_Organizations_OrganizationId",
                table: "AuditEvents");

            migrationBuilder.DropForeignKey(
                name: "FK_AuditEvents_Users_ActorUserId",
                table: "AuditEvents");

            migrationBuilder.DropIndex(
                name: "IX_AuditEvents_Outcome_Timestamp",
                table: "AuditEvents");

            // Reverse migration of enum values from new (starting at 0) back to old (starting at 1)
            // IMPORTANT: The enum value shifts must happen before recreating the index below.
            // This ensures that the index filter matches the old enum values and maintains data consistency.

            // AuditResourceType: Values in 0-9 range (core entities) need to shift by +1
            migrationBuilder.Sql("UPDATE \"AuditEvents\" SET \"ResourceType\" = \"ResourceType\" + 1 WHERE \"ResourceType\" < 10");

            // AuditActionType: Values in 0-9 range (lifecycle) need to shift by +1
            migrationBuilder.Sql("UPDATE \"AuditEvents\" SET \"ActionType\" = \"ActionType\" + 1 WHERE \"ActionType\" < 10");

            // AuditOutcome: Success=0->1, Failure=1->2, Denied=2->3, Partial=3->4
            migrationBuilder.Sql("UPDATE \"AuditEvents\" SET \"Outcome\" = \"Outcome\" + 1");

            migrationBuilder.CreateIndex(
                name: "IX_AuditEvents_Outcome_Timestamp",
                table: "AuditEvents",
                columns: new[] { "Outcome", "Timestamp" },
                descending: new[] { false, true },
                filter: "\"Outcome\" IN (2, 3)");
        }
    }
}
