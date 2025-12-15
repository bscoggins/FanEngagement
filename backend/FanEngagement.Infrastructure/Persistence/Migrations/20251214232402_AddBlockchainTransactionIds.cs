using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FanEngagement.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBlockchainTransactionIds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BlockchainTransactionId",
                table: "Votes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BlockchainTransactionId",
                table: "ShareIssuances",
                type: "text",
                nullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "IsEnabled",
                table: "OrganizationFeatureFlags",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BlockchainTransactionId",
                table: "Votes");

            migrationBuilder.DropColumn(
                name: "BlockchainTransactionId",
                table: "ShareIssuances");

            migrationBuilder.AlterColumn<bool>(
                name: "IsEnabled",
                table: "OrganizationFeatureFlags",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean");
        }
    }
}
