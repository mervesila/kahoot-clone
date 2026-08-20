using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TKI.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSelectedQuestionIds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SelectedQuestionIds",
                table: "ExamAttempts",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SelectedQuestionIds",
                table: "ExamAttempts");
        }
    }
}
