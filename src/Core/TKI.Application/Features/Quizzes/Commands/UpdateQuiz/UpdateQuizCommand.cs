using MediatR;

namespace TKI.Application.Features.Quizzes.Commands.UpdateQuiz;

public record UpdateQuizCommand(
    Guid Id,
    string Title,
    string Description,
    bool IsActive,
    int? CategoryId,
    int Level,
    int PassScore,
    int DefaultTimeLimitInSeconds,
    bool JokersEnabled) : IRequest;
