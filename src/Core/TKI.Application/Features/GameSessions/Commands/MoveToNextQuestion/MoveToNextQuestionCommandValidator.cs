using FluentValidation;
using TKI.Application.Features.GameSessions.Commands.MoveToNextQuestion;

namespace TKI.Application.Features.GameSessions.Commands.MoveToNextQuestion;

public class MoveToNextQuestionCommandValidator : AbstractValidator<MoveToNextQuestionCommand>
{
    public MoveToNextQuestionCommandValidator()
    {
        RuleFor(x => x.GameSessionId)
            .NotEmpty().WithMessage("Oturum seçilmelidir.");
    }
}
