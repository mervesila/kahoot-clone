using MediatR;

namespace TKI.Application.Features.Quizzes.Commands.ImportQuestionPool;

public record ImportQuestionPoolCommand(
    string Title,
    string Description,
    string CategoryName,
    List<PoolQuestionItem> Questions) : IRequest<Guid>;

public record PoolQuestionItem(
    string Text,
    List<string> Options,
    int CorrectIndex);
