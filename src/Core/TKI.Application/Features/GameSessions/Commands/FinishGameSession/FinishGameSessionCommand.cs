using MediatR;

namespace TKI.Application.Features.GameSessions.Commands.FinishGameSession;

public record FinishGameSessionCommand(Guid GameSessionId) : IRequest<GameSessionStateDto>;
