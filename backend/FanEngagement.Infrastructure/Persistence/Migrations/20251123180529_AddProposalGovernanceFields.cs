using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FanEngagement.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProposalGovernanceFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ClosedAt",
                table: "Proposals",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "EligibleVotingPowerSnapshot",
                table: "Proposals",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "QuorumMet",
                table: "Proposals",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalVotesCast",
                table: "Proposals",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "WinningOptionId",
                table: "Proposals",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ClosedAt",
                table: "Proposals");

            migrationBuilder.DropColumn(
                name: "EligibleVotingPowerSnapshot",
                table: "Proposals");

            migrationBuilder.DropColumn(
                name: "QuorumMet",
                table: "Proposals");

            migrationBuilder.DropColumn(
                name: "TotalVotesCast",
                table: "Proposals");

            migrationBuilder.DropColumn(
                name: "WinningOptionId",
                table: "Proposals");
        }
    }
}
