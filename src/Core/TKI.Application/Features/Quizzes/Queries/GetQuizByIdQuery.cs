using MediatR;

namespace TKI.Application.Features.Quizzes.Queries;

public record GetQuizByIdQuery(Guid QuizId) : IRequest<QuizDetailDto>;
