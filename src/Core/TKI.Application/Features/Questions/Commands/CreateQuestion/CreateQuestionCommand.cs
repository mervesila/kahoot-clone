using MediatR;

namespace TKI.Application.Features.Questions.Commands.CreateQuestion;

public record CreateQuestionOption(string Text, bool IsCorrect);

public record CreateQuestionCommand(
    int CategoryId,
    Guid? QuizId,
    string Text,
    string? MediaUrl,
    string TargetRole,
    int TimeLimitInSeconds,
    int Points,
    List<CreateQuestionOption> Options) : IRequest<Guid>;
