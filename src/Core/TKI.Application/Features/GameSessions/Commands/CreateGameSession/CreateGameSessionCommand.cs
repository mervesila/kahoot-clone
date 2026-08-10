using MediatR;
using TKI.Application.Features.GameSessions.DTOs;

namespace TKI.Application.Features.GameSessions.Commands.CreateGameSession;

public record CreateGameSessionCommand(
    Guid QuizId,
    bool IsTeamMode = false) : IRequest<GameSessionDto>;
