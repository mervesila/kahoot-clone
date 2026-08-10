using MediatR;

namespace TKI.Application.Features.Quizzes.Commands.AddQuestionToQuiz;

public record AddQuestionToQuizCommand(
    Guid QuizId,
    Guid QuestionId,
    int OrderNo = 0) : IRequest;
