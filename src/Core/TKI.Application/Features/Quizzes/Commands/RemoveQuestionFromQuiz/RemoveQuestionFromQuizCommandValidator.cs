using FluentValidation;

namespace TKI.Application.Features.Quizzes.Commands.RemoveQuestionFromQuiz;

public class RemoveQuestionFromQuizCommandValidator : AbstractValidator<RemoveQuestionFromQuizCommand>
{
    public RemoveQuestionFromQuizCommandValidator()
    {
        RuleFor(x => x.QuizId)
            .NotEmpty().WithMessage("Quiz seçilmelidir.");

        RuleFor(x => x.QuestionId)
            .NotEmpty().WithMessage("Soru seçilmelidir.");
    }
}
