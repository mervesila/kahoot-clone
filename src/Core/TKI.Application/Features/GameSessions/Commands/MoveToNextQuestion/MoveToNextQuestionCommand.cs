using MediatR;

namespace TKI.Application.Features.GameSessions.Commands.MoveToNextQuestion;

public record MoveToNextQuestionCommand(Guid GameSessionId) : IRequest<GameSessionStateDto>;
