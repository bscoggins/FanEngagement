using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FanEngagement.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
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

            migrationBuilder.AddColumn<Guid>(
                name: "OrganizationId",
                table: "OutboundEvents",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

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
