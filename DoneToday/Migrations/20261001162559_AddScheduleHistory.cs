using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DoneToday.Migrations
{
    /// <inheritdoc />
    public partial class AddScheduleHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_HabitSchedules_HabitId_DayOfWeek",
                table: "HabitSchedules");

            migrationBuilder.AddColumn<DateOnly>(
                name: "ValidFrom",
                table: "HabitSchedules",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(1, 1, 1));

            migrationBuilder.AddColumn<DateOnly>(
                name: "ValidTo",
                table: "HabitSchedules",
                type: "date",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_HabitSchedules_HabitId_DayOfWeek_ValidFrom",
                table: "HabitSchedules",
                columns: new[] { "HabitId", "DayOfWeek", "ValidFrom" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_HabitSchedules_HabitId_DayOfWeek_ValidFrom",
                table: "HabitSchedules");

            migrationBuilder.DropColumn(
                name: "ValidFrom",
                table: "HabitSchedules");

            migrationBuilder.DropColumn(
                name: "ValidTo",
                table: "HabitSchedules");

            migrationBuilder.CreateIndex(
                name: "IX_HabitSchedules_HabitId_DayOfWeek",
                table: "HabitSchedules",
                columns: new[] { "HabitId", "DayOfWeek" },
                unique: true);
        }
    }
}
