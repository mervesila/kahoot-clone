using MediatR;

namespace TKI.Application.Features.GameSessions.Queries.GetGameSessionReport;

public record GetGameSessionReportQuery(Guid GameSessionId) : IRequest<GameSessionReportDto>;
