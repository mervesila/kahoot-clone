using MediatR;

namespace TKI.Application.Features.Quizzes.Commands.RemoveQuestionFromQuiz;

public record RemoveQuestionFromQuizCommand(
    Guid QuizId,
    Guid QuestionId) : IRequest;
