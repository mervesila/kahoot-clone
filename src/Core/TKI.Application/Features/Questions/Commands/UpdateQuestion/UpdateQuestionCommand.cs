using MediatR;

namespace TKI.Application.Features.Questions.Commands.UpdateQuestion;

public record UpdateQuestionOption(string Text, bool IsCorrect);

public record UpdateQuestionCommand(
    Guid Id,
    int CategoryId,
    string Text,
    string? MediaUrl,
    string TargetRole,
    int TimeLimitInSeconds,
    int Points,
    List<UpdateQuestionOption> Options) : IRequest;
