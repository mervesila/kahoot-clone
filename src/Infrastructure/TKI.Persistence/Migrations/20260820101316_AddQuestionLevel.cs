using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TKI.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddQuestionLevel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Level",
                table: "Questions",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Level",
                table: "Questions");
        }
    }
}
