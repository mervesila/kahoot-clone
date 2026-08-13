using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TKI.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddIsgCategoryAndBindPool : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                INSERT INTO "Categories" ("Name", "Description", "IsActive", "CreatedAt")
                SELECT 'İSG', 'İş sağlığı ve güvenliği soru havuzu: İSG kuralları, riskler ve koruyucu önlemler', TRUE, NOW()
                WHERE NOT EXISTS (SELECT 1 FROM "Categories" WHERE "Name" = 'İSG');
                """);

            migrationBuilder.Sql(
                """
                UPDATE "Questions"
                SET "CategoryId" = (SELECT "Id" FROM "Categories" WHERE "Name" = 'İSG')
                WHERE "QuizId" IS NULL;
                """);

            migrationBuilder.Sql(
                """
                UPDATE "Quizzes"
                SET "CategoryId" = (SELECT "Id" FROM "Categories" WHERE "Name" = 'İSG')
                WHERE "Title" IN ('İSG Seviye 1', 'İSG Seviye 2');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE "Quizzes"
                SET "CategoryId" = NULL
                WHERE "Title" IN ('İSG Seviye 1', 'İSG Seviye 2');
                """);

            migrationBuilder.Sql(
                """
                DELETE FROM "Categories" AS c
                WHERE c."Name" = 'İSG'
                  AND NOT EXISTS (SELECT 1 FROM "Questions" q WHERE q."CategoryId" = c."Id");
                """);
        }
    }
}
