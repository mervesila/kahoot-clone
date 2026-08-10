using TKI.Application.Features.GameSessions.Queries.GetGameSessionReport;

namespace TKI.Application.Common.Interfaces;

public interface IReportExportService
{
    Task<byte[]> ExportPdfAsync(GameSessionReportDto report, CancellationToken cancellationToken = default);
    Task<byte[]> ExportExcelAsync(GameSessionReportDto report, CancellationToken cancellationToken = default);
}
