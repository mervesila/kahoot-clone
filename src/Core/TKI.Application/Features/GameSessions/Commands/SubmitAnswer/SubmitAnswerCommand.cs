using MediatR;

namespace TKI.Application.Features.GameSessions.Commands.SubmitAnswer;

public record SubmitAnswerCommand(
    Guid GameSessionId,
    Guid PlayerId,
    Guid QuestionId,
    Guid SelectedOptionId,
    int ResponseTimeInSeconds) : IRequest<SubmitAnswerResult>;
