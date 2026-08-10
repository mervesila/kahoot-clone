using MediatR;

namespace TKI.Application.Features.GameSessions.Queries.GetCurrentQuestion;

public record GetCurrentQuestionQuery(
    Guid GameSessionId,
    Guid PlayerId) : IRequest<CurrentQuestionDto>;
