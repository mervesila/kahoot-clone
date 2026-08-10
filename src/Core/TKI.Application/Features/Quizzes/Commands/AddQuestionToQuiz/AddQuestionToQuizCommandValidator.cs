using FluentValidation;
using TKI.Application.Features.Quizzes.Commands.AddQuestionToQuiz;

namespace TKI.Application.Features.Quizzes.Commands.AddQuestionToQuiz;

public class AddQuestionToQuizCommandValidator : AbstractValidator<AddQuestionToQuizCommand>
{
    public AddQuestionToQuizCommandValidator()
    {
        RuleFor(x => x.QuizId)
            .NotEmpty().WithMessage("Quiz seçilmelidir.");

        RuleFor(x => x.QuestionId)
            .NotEmpty().WithMessage("Soru seçilmelidir.");
    }
}
