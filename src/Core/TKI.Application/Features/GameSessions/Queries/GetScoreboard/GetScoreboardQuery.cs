using MediatR;

namespace TKI.Application.Features.GameSessions.Queries.GetScoreboard;

public record GetScoreboardQuery(Guid GameSessionId) : IRequest<ScoreboardDto>;
