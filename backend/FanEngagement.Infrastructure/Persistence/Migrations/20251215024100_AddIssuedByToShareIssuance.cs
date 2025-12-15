using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FanEngagement.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddIssuedByToShareIssuance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EncryptedPrivateKey",
                table: "UserWalletAddresses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "IssuedByUserId",
                table: "ShareIssuances",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Reason",
                table: "ShareIssuances",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EncryptedPrivateKey",
                table: "UserWalletAddresses");

            migrationBuilder.DropColumn(
                name: "IssuedByUserId",
                table: "ShareIssuances");

            migrationBuilder.DropColumn(
                name: "Reason",
                table: "ShareIssuances");
        }
    }
}
