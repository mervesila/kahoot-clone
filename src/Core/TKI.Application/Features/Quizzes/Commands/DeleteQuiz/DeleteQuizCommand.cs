using MediatR;

namespace TKI.Application.Features.Quizzes.Commands.DeleteQuiz;

public record DeleteQuizCommand(Guid QuizId) : IRequest;
