using MediatR;
using TKI.Application.Features.GameSessions.Commands;

namespace TKI.Application.Features.GameSessions.Queries.GetGameSessionState;

public record GetGameSessionStateQuery(Guid GameSessionId) : IRequest<GameSessionStateDto>;
