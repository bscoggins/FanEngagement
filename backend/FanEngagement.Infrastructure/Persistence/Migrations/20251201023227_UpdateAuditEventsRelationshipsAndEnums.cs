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

            migrationBuilder.CreateIndex(
                name: "IX_AuditEvents_Outcome_Timestamp",
                table: "AuditEvents",
                columns: new[] { "Outcome", "Timestamp" },
                descending: new[] { false, true },
                filter: "\"Outcome\" IN (2, 3)");
        }
    }
}
