using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FanEngagement.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLastErrorToOutboundEvent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LastError",
                table: "OutboundEvents",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastError",
                table: "OutboundEvents");
        }
    }
}
