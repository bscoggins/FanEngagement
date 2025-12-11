using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FanEngagement.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Migration to add blockchain-related fields and user wallet addresses.
    /// 
    /// NOTE: This migration uses PostgreSQL-specific syntax for filtered unique indexes.
    /// The partial index filter syntax ("IsPrimary" = TRUE) is specific to PostgreSQL.
    /// If supporting other database providers in the future, this migration will need
    /// provider-specific implementations.
    /// </summary>
    /// <inheritdoc />
    public partial class AddUserWalletAddressesAndBlockchainFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BlockchainMintAddress",
                table: "ShareTypes",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TokenDecimals",
                table: "ShareTypes",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "BlockchainProposalAddress",
                table: "Proposals",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LatestContentHash",
                table: "Proposals",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LatestResultsHash",
                table: "Proposals",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BlockchainAccountAddress",
                table: "Organizations",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "UserWalletAddresses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    BlockchainType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Address = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IsPrimary = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserWalletAddresses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserWalletAddresses_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserWalletAddresses_Address",
                table: "UserWalletAddresses",
                column: "Address",
                unique: true);

            // This partial unique index ensures only one primary wallet per user per blockchain type.
            // Application logic must ensure that when a wallet is set to primary, all other wallets
            // for the same user and blockchain are set to non-primary to avoid constraint violations.
            migrationBuilder.CreateIndex(
                name: "IX_UserWalletAddresses_User_Blockchain_Primary",
                table: "UserWalletAddresses",
                columns: new[] { "UserId", "BlockchainType" },
                unique: true,
                filter: "\"IsPrimary\" = TRUE");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserWalletAddresses");

            migrationBuilder.DropColumn(
                name: "BlockchainMintAddress",
                table: "ShareTypes");

            migrationBuilder.DropColumn(
                name: "TokenDecimals",
                table: "ShareTypes");

            migrationBuilder.DropColumn(
                name: "BlockchainProposalAddress",
                table: "Proposals");

            migrationBuilder.DropColumn(
                name: "LatestContentHash",
                table: "Proposals");

            migrationBuilder.DropColumn(
                name: "LatestResultsHash",
                table: "Proposals");

            migrationBuilder.DropColumn(
                name: "BlockchainAccountAddress",
                table: "Organizations");
        }
    }
}
