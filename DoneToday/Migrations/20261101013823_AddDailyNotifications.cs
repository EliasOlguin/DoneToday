using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace DoneToday.Migrations
{
    /// <inheritdoc />
    public partial class AddDailyNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NotificationDevices",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    EndpointHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    AuthorizationStampHash = table.Column<string>(type: "text", nullable: false),
                    ProtectedSubscription = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastTestAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationDevices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NotificationDevices_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NotificationPreferences",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    MorningEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    MorningTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    EveningEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    EveningTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    Language = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationPreferences", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_NotificationPreferences_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NotificationDeliveries",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DeviceId = table.Column<int>(type: "integer", nullable: false),
                    Key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Kind = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Count = table.Column<int>(type: "integer", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    NextAttemptAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LockedUntil = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Attempts = table.Column<int>(type: "integer", nullable: false),
                    Finished = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationDeliveries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NotificationDeliveries_NotificationDevices_DeviceId",
                        column: x => x.DeviceId,
                        principalTable: "NotificationDevices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationDeliveries_DeviceId_Key",
                table: "NotificationDeliveries",
                columns: new[] { "DeviceId", "Key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NotificationDeliveries_Finished_NextAttemptAt",
                table: "NotificationDeliveries",
                columns: new[] { "Finished", "NextAttemptAt" });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationDevices_EndpointHash",
                table: "NotificationDevices",
                column: "EndpointHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NotificationDevices_UserId",
                table: "NotificationDevices",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NotificationDeliveries");

            migrationBuilder.DropTable(
                name: "NotificationPreferences");

            migrationBuilder.DropTable(
                name: "NotificationDevices");
        }
    }
}
