using MediatR;
using Microsoft.AspNetCore.Mvc;
using TKI.Application.Common.Interfaces;
using TKI.Application.Features.GameSessions.Queries.GetGameSessionQuestions;
using TKI.Application.Features.GameSessions.Queries.GetGameSessionReport;

namespace TKI.WebAPI.Controllers.Admin;

[Route("api/admin/game-sessions")]
public class GameSessionsController : AdminBaseController
{
    private readonly IMediator _mediator;
    private readonly IReportExportService _reportExportService;

    public GameSessionsController(IMediator mediator, IReportExportService reportExportService)
    {
        _mediator = mediator;
        _reportExportService = reportExportService;
    }

    [HttpGet("{sessionId:guid}/questions")]
    public async Task<IActionResult> GetQuestions(Guid sessionId)
    {
        var questions = await _mediator.Send(new GetGameSessionQuestionsQuery(sessionId));
        return Ok(questions);
    }

    [HttpGet("{sessionId:guid}/report")]
    public async Task<IActionResult> GetReport(Guid sessionId)
    {
        var report = await _mediator.Send(new GetGameSessionReportQuery(sessionId));
        return Ok(report);
    }

    [HttpGet("{sessionId:guid}/report/export")]
    public async Task<IActionResult> ExportReport(Guid sessionId, [FromQuery] string format = "pdf")
    {
        var report = await _mediator.Send(new GetGameSessionReportQuery(sessionId));

        var normalized = format.ToLowerInvariant();

        if (normalized is "excel" or "xlsx")
        {
            var bytes = await _reportExportService.ExportExcelAsync(report);
            return File(
                bytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"oyun-raporu-{sessionId:N}.xlsx");
        }

        var pdf = await _reportExportService.ExportPdfAsync(report);
        return File(pdf, "application/pdf", $"oyun-raporu-{sessionId:N}.pdf");
    }
}
