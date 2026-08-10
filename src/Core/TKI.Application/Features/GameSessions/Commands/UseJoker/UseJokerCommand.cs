using MediatR;

namespace TKI.Application.Features.GameSessions.Commands.UseJoker;

public record UseJokerCommand(
    Guid GameSessionId,
    Guid PlayerId,
    Guid QuestionId,
    string JokerType) : IRequest;
