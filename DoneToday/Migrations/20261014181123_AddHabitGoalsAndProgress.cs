using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace DoneToday.Migrations
{
    /// <inheritdoc />
    public partial class AddHabitGoalsAndProgress : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "GoalEffectiveFrom",
                table: "Habits",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "GoalTarget",
                table: "Habits",
                type: "numeric(12,3)",
                precision: 12,
                scale: 3,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GoalUnit",
                table: "Habits",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "HabitDayProgress",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    HabitId = table.Column<int>(type: "integer", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Target = table.Column<decimal>(type: "numeric(12,3)", precision: 12, scale: 3, nullable: false),
                    Unit = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(12,3)", precision: 12, scale: 3, nullable: false),
                    Revision = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HabitDayProgress", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HabitDayProgress_Habits_HabitId",
                        column: x => x.HabitId,
                        principalTable: "Habits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HabitGoals",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    HabitId = table.Column<int>(type: "integer", nullable: false),
                    Target = table.Column<decimal>(type: "numeric(12,3)", precision: 12, scale: 3, nullable: true),
                    Unit = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    ValidFrom = table.Column<DateOnly>(type: "date", nullable: false),
                    ValidTo = table.Column<DateOnly>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HabitGoals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HabitGoals_Habits_HabitId",
                        column: x => x.HabitId,
                        principalTable: "Habits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HabitProgressEntries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    HabitDayProgressId = table.Column<int>(type: "integer", nullable: false),
                    HabitId = table.Column<int>(type: "integer", nullable: false),
                    OperationId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(12,3)", precision: 12, scale: 3, nullable: false),
                    ResultingAmount = table.Column<decimal>(type: "numeric(12,3)", precision: 12, scale: 3, nullable: false),
                    IsCorrection = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HabitProgressEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HabitProgressEntries_HabitDayProgress_HabitDayProgressId",
                        column: x => x.HabitDayProgressId,
                        principalTable: "HabitDayProgress",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_HabitDayProgress_HabitId_Date",
                table: "HabitDayProgress",
                columns: new[] { "HabitId", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HabitGoals_HabitId_ValidFrom",
                table: "HabitGoals",
                columns: new[] { "HabitId", "ValidFrom" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HabitProgressEntries_HabitDayProgressId",
                table: "HabitProgressEntries",
                column: "HabitDayProgressId");

            migrationBuilder.CreateIndex(
                name: "IX_HabitProgressEntries_HabitId_OperationId",
                table: "HabitProgressEntries",
                columns: new[] { "HabitId", "OperationId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HabitGoals");

            migrationBuilder.DropTable(
                name: "HabitProgressEntries");

            migrationBuilder.DropTable(
                name: "HabitDayProgress");

            migrationBuilder.DropColumn(
                name: "GoalEffectiveFrom",
                table: "Habits");

            migrationBuilder.DropColumn(
                name: "GoalTarget",
                table: "Habits");

            migrationBuilder.DropColumn(
                name: "GoalUnit",
                table: "Habits");
        }
    }
}
