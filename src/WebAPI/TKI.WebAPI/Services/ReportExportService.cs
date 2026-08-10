using ClosedXML.Excel;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using TKI.Application.Common.Interfaces;
using TKI.Application.Features.GameSessions.Queries.GetGameSessionReport;

namespace TKI.WebAPI.Services;

public class ReportExportService : IReportExportService
{
    static ReportExportService()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public Task<byte[]> ExportPdfAsync(GameSessionReportDto report, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var pdf = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(30);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header()
                    .Text($"{report.QuizTitle} - Oyun Raporu")
                    .FontSize(16)
                    .SemiBold();

                page.Content()
                    .PaddingVertical(10)
                    .Column(column =>
                    {
                        column.Item().Text($"Durum: {report.Status}");
                        column.Item().Text($"Başlangıç: {report.StartedAt?.ToString("g") ?? "-"}");
                        column.Item().Text($"Bitiş: {report.FinishedAt?.ToString("g") ?? "-"}");
                        column.Item().PaddingTop(8).Text("Oyuncular").SemiBold().FontSize(12);

                        column.Item().Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.RelativeColumn(3);
                                columns.RelativeColumn(2);
                                columns.RelativeColumn(1);
                                columns.RelativeColumn(1);
                            });

                            table.Header(header =>
                            {
                                header.Cell().Element(CellStyle).Text("Oyuncu").SemiBold();
                                header.Cell().Element(CellStyle).Text("Skor").SemiBold();
                                header.Cell().Element(CellStyle).Text("Doğru").SemiBold();
                                header.Cell().Element(CellStyle).Text("Başarı%").SemiBold();
                            });

                            foreach (var player in report.Players)
                            {
                                table.Cell().Element(CellStyle).Text(player.PlayerName);
                                table.Cell().Element(CellStyle).Text(player.Score.ToString());
                                table.Cell().Element(CellStyle).Text(player.CorrectCount.ToString());
                                table.Cell().Element(CellStyle).Text($"{player.Accuracy:0.#}");
                            }
                        });

                        if (report.IsTeamMode)
                        {
                            column.Item().PaddingTop(12).Text("Takımlar").SemiBold().FontSize(12);

                            column.Item().Table(table =>
                            {
                                table.ColumnsDefinition(columns =>
                                {
                                    columns.RelativeColumn(2);
                                    columns.RelativeColumn(1);
                                    columns.RelativeColumn(1);
                                    columns.RelativeColumn(1);
                                });

                                table.Header(header =>
                                {
                                    header.Cell().Element(CellStyle).Text("Takım").SemiBold();
                                    header.Cell().Element(CellStyle).Text("Oyuncu").SemiBold();
                                    header.Cell().Element(CellStyle).Text("Toplam").SemiBold();
                                    header.Cell().Element(CellStyle).Text("Ortalama").SemiBold();
                                });

                                foreach (var team in report.Teams)
                                {
                                    table.Cell().Element(CellStyle).Text(team.TeamName);
                                    table.Cell().Element(CellStyle).Text(team.PlayerCount.ToString());
                                    table.Cell().Element(CellStyle).Text(team.TotalScore.ToString());
                                    table.Cell().Element(CellStyle).Text(team.AverageScore.ToString());
                                }
                            });
                        }

                        column.Item().PaddingTop(12).Text("Soru Analizi").SemiBold().FontSize(12);

                        foreach (var question in report.Questions)
                        {
                            column.Item().PaddingTop(6).Text($"{question.OrderNo}. {question.Text}").SemiBold();

                            foreach (var option in question.Options)
                            {
                                column.Item().Text(
                                    $"   {option.Text} - {option.PickCount} cevap{(option.IsCorrect ? " (Doğru)" : string.Empty)}");
                            }
                        }
                    });

                page.Footer()
                    .AlignRight()
                    .Text(x =>
                    {
                        x.Span("Sayfa ");
                        x.CurrentPageNumber();
                    });
            });
        }).GeneratePdf();

        return Task.FromResult(pdf);
    }

    public Task<byte[]> ExportExcelAsync(GameSessionReportDto report, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        using var workbook = new XLWorkbook();

        var summary = workbook.Worksheets.Add("Özet");
        summary.Cell(1, 1).Value = "Rapor";
        summary.Cell(1, 2).Value = report.QuizTitle;
        summary.Cell(2, 1).Value = "Durum";
        summary.Cell(2, 2).Value = report.Status;
        summary.Cell(3, 1).Value = "Başlangıç";
        summary.Cell(3, 2).Value = report.StartedAt?.ToString("g") ?? "-";
        summary.Cell(4, 1).Value = "Bitiş";
        summary.Cell(4, 2).Value = report.FinishedAt?.ToString("g") ?? "-";
        summary.Column(1).AdjustToContents();

        var playersSheet = workbook.Worksheets.Add("Oyuncular");
        playersSheet.Cell(1, 1).Value = "Oyuncu";
        playersSheet.Cell(1, 2).Value = "Takım";
        playersSheet.Cell(1, 3).Value = "Skor";
        playersSheet.Cell(1, 4).Value = "Doğru";
        playersSheet.Cell(1, 5).Value = "Cevaplanan";
        playersSheet.Cell(1, 6).Value = "Başarı%";

        var playerRow = 2;
        foreach (var player in report.Players)
        {
            playersSheet.Cell(playerRow, 1).Value = player.PlayerName;
            playersSheet.Cell(playerRow, 2).Value = player.TeamName ?? "-";
            playersSheet.Cell(playerRow, 3).Value = player.Score;
            playersSheet.Cell(playerRow, 4).Value = player.CorrectCount;
            playersSheet.Cell(playerRow, 5).Value = player.TotalAnswers;
            playersSheet.Cell(playerRow, 6).Value = player.Accuracy;
            playerRow++;
        }

        playersSheet.Columns(1, 6).AdjustToContents();

        var questionsSheet = workbook.Worksheets.Add("Sorular");
        questionsSheet.Cell(1, 1).Value = "No";
        questionsSheet.Cell(1, 2).Value = "Soru";
        questionsSheet.Cell(1, 3).Value = "Şık";
        questionsSheet.Cell(1, 4).Value = "Doğru mu?";
        questionsSheet.Cell(1, 5).Value = "Cevap Sayısı";

        var questionRow = 2;
        foreach (var question in report.Questions)
        {
            foreach (var option in question.Options)
            {
                questionsSheet.Cell(questionRow, 1).Value = question.OrderNo;
                questionsSheet.Cell(questionRow, 2).Value = question.Text;
                questionsSheet.Cell(questionRow, 3).Value = option.Text;
                questionsSheet.Cell(questionRow, 4).Value = option.IsCorrect ? "Evet" : "Hayır";
                questionsSheet.Cell(questionRow, 5).Value = option.PickCount;
                questionRow++;
            }
        }

        questionsSheet.Columns(1, 5).AdjustToContents();

        if (report.IsTeamMode)
        {
            var teamsSheet = workbook.Worksheets.Add("Takımlar");
            teamsSheet.Cell(1, 1).Value = "Takım";
            teamsSheet.Cell(1, 2).Value = "Oyuncu";
            teamsSheet.Cell(1, 3).Value = "Toplam";
            teamsSheet.Cell(1, 4).Value = "Ortalama";

            var teamRow = 2;
            foreach (var team in report.Teams)
            {
                teamsSheet.Cell(teamRow, 1).Value = team.TeamName;
                teamsSheet.Cell(teamRow, 2).Value = team.PlayerCount;
                teamsSheet.Cell(teamRow, 3).Value = team.TotalScore;
                teamsSheet.Cell(teamRow, 4).Value = team.AverageScore;
                teamRow++;
            }

            teamsSheet.Columns(1, 4).AdjustToContents();
        }

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);

        return Task.FromResult(stream.ToArray());
    }

    private static IContainer CellStyle(IContainer container) => container
        .BorderBottom(1)
        .BorderColor(Colors.Grey.Lighten2)
        .Padding(4);
}
