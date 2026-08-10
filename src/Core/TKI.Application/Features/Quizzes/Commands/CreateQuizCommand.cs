using MediatR;

namespace TKI.Application.Features.Quizzes.Commands;

public record CreateQuizCommand(
    string Title,
    string Description,
    bool IsActive = true,
    int? CategoryId = null,
    int Level = 1,
    int PassScore = 70,
    int DefaultTimeLimitInSeconds = 30,
    bool JokersEnabled = true) : IRequest<Guid>;
