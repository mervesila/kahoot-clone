using MediatR;

namespace TKI.Application.Features.GameSessions.Commands.StartGameSession;

public record StartGameSessionCommand(Guid GameSessionId) : IRequest<GameSessionStateDto>;
