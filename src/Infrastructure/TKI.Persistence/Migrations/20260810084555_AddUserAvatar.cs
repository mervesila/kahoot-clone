using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TKI.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUserAvatar : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AvatarColor",
                table: "Users",
                type: "text",
                nullable: false,
                defaultValue: "#e2257b");

            migrationBuilder.AddColumn<string>(
                name: "AvatarEmoji",
                table: "Users",
                type: "text",
                nullable: false,
                defaultValue: "🦊");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AvatarColor",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "AvatarEmoji",
                table: "Users");
        }
    }
}
