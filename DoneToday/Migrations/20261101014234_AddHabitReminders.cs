using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DoneToday.Migrations
{
    /// <inheritdoc />
    public partial class AddHabitReminders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "HabitId",
                table: "NotificationDeliveries",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "HabitReminders",
                columns: table => new
                {
                    HabitId = table.Column<int>(type: "integer", nullable: false),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Enabled = table.Column<bool>(type: "boolean", nullable: false),
                    Time = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    SnoozedDate = table.Column<DateOnly>(type: "date", nullable: true),
                    SnoozedUntil = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HabitReminders", x => x.HabitId);
                    table.ForeignKey(
                        name: "FK_HabitReminders_Habits_HabitId",
                        column: x => x.HabitId,
                        principalTable: "Habits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_HabitReminders_UserId_Enabled",
                table: "HabitReminders",
                columns: new[] { "UserId", "Enabled" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HabitReminders");

            migrationBuilder.DropColumn(
                name: "HabitId",
                table: "NotificationDeliveries");
        }
    }
}
