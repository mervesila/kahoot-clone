using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TKI.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class DynamicSessionQuestions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GameSessionQuestions",
                columns: table => new
                {
                    GameSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuestionId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderNo = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GameSessionQuestions", x => new { x.GameSessionId, x.QuestionId });
                    table.ForeignKey(
                        name: "FK_GameSessionQuestions_GameSessions_GameSessionId",
                        column: x => x.GameSessionId,
                        principalTable: "GameSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GameSessionQuestions_Questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "Questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GameSessionQuestions_GameSessionId_OrderNo",
                table: "GameSessionQuestions",
                columns: new[] { "GameSessionId", "OrderNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GameSessionQuestions_QuestionId",
                table: "GameSessionQuestions",
                column: "QuestionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GameSessionQuestions");
        }
    }
}
