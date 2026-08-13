using MediatR;

namespace TKI.Application.Features.GameSessions.Queries.GetGameSessionQuestions;

public record GetGameSessionQuestionsQuery(Guid GameSessionId) : IRequest<List<SessionQuestionDto>>;
