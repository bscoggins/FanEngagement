using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FanEngagement.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    /// <remarks>
    /// This migration adds OrganizationId to OutboundEvents for better organization-scoped queries.
    /// The migration safely handles existing data by:
    /// 1. Adding OrganizationId as nullable
    /// 2. Populating it from WebhookEndpoint.OrganizationId for existing rows
    /// 3. Making it non-nullable with foreign key constraint
    /// </remarks>
    public partial class AddOrganizationIdToOutboundEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OutboundEvents_WebhookEndpoints_WebhookEndpointId",
                table: "OutboundEvents");

            migrationBuilder.AlterColumn<Guid>(
                name: "WebhookEndpointId",
                table: "OutboundEvents",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            // Step 1: Add OrganizationId column as nullable
            migrationBuilder.AddColumn<Guid>(
                name: "OrganizationId",
                table: "OutboundEvents",
                type: "uuid",
                nullable: true);

            // Step 2: Populate OrganizationId for existing rows from WebhookEndpoint
            migrationBuilder.Sql(@"
                UPDATE ""OutboundEvents"" oe
                SET ""OrganizationId"" = we.""OrganizationId""
                FROM ""WebhookEndpoints"" we
                WHERE oe.""WebhookEndpointId"" = we.""Id"" AND oe.""OrganizationId"" IS NULL;
            ");

            // Step 3: Make OrganizationId non-nullable
            migrationBuilder.AlterColumn<Guid>(
                name: "OrganizationId",
                table: "OutboundEvents",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_OutboundEvents_OrganizationId_Status_CreatedAt",
                table: "OutboundEvents",
                columns: new[] { "OrganizationId", "Status", "CreatedAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_OutboundEvents_Organizations_OrganizationId",
                table: "OutboundEvents",
                column: "OrganizationId",
                principalTable: "Organizations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_OutboundEvents_WebhookEndpoints_WebhookEndpointId",
                table: "OutboundEvents",
                column: "WebhookEndpointId",
                principalTable: "WebhookEndpoints",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OutboundEvents_Organizations_OrganizationId",
                table: "OutboundEvents");

            migrationBuilder.DropForeignKey(
                name: "FK_OutboundEvents_WebhookEndpoints_WebhookEndpointId",
                table: "OutboundEvents");

            migrationBuilder.DropIndex(
                name: "IX_OutboundEvents_OrganizationId_Status_CreatedAt",
                table: "OutboundEvents");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                table: "OutboundEvents");

            migrationBuilder.AlterColumn<Guid>(
                name: "WebhookEndpointId",
                table: "OutboundEvents",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_OutboundEvents_WebhookEndpoints_WebhookEndpointId",
                table: "OutboundEvents",
                column: "WebhookEndpointId",
                principalTable: "WebhookEndpoints",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
