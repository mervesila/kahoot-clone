using MediatR;

namespace TKI.Application.Features.Quizzes.Queries;

public record GetAllQuizzesQuery : IRequest<List<QuizDto>>;
