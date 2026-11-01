using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DoneToday.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationFollowUp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "PausedThrough",
                table: "NotificationPreferences",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "QuietEnabled",
                table: "NotificationPreferences",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "QuietEnd",
                table: "NotificationPreferences",
                type: "time without time zone",
                nullable: false,
                defaultValue: new TimeOnly(0, 0, 0));

            migrationBuilder.AddColumn<TimeOnly>(
                name: "QuietStart",
                table: "NotificationPreferences",
                type: "time without time zone",
                nullable: false,
                defaultValue: new TimeOnly(0, 0, 0));

            migrationBuilder.AddColumn<bool>(
                name: "ShowHabitNames",
                table: "NotificationPreferences",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "WeeklyDay",
                table: "NotificationPreferences",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "WeeklyEnabled",
                table: "NotificationPreferences",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "WeeklyTime",
                table: "NotificationPreferences",
                type: "time without time zone",
                nullable: false,
                defaultValue: new TimeOnly(0, 0, 0));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PausedThrough",
                table: "NotificationPreferences");

            migrationBuilder.DropColumn(
                name: "QuietEnabled",
                table: "NotificationPreferences");

            migrationBuilder.DropColumn(
                name: "QuietEnd",
                table: "NotificationPreferences");

            migrationBuilder.DropColumn(
                name: "QuietStart",
                table: "NotificationPreferences");

            migrationBuilder.DropColumn(
                name: "ShowHabitNames",
                table: "NotificationPreferences");

            migrationBuilder.DropColumn(
                name: "WeeklyDay",
                table: "NotificationPreferences");

            migrationBuilder.DropColumn(
                name: "WeeklyEnabled",
                table: "NotificationPreferences");

            migrationBuilder.DropColumn(
                name: "WeeklyTime",
                table: "NotificationPreferences");
        }
    }
}
