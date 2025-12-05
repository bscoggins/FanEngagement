using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FanEngagement.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBlockchainConfiguration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BlockchainConfig",
                table: "Organizations",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BlockchainType",
                table: "Organizations",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "None");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BlockchainConfig",
                table: "Organizations");

            migrationBuilder.DropColumn(
                name: "BlockchainType",
                table: "Organizations");
        }
    }
}
