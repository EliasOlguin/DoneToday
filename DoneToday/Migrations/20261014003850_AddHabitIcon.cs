using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DoneToday.Migrations
{
    /// <inheritdoc />
    public partial class AddHabitIcon : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Icon",
                table: "Habits",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "habit");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Icon",
                table: "Habits");
        }
    }
}
