using FluentValidation;

namespace TKI.Application.Features.Quizzes.Commands.DeleteQuiz;

public class DeleteQuizCommandValidator : AbstractValidator<DeleteQuizCommand>
{
    public DeleteQuizCommandValidator()
    {
        RuleFor(x => x.QuizId)
            .NotEmpty().WithMessage("Quiz kimliği zorunludur.");
    }
}
