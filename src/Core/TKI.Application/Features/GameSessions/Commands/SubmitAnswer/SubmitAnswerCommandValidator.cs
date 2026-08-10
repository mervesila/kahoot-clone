using FluentValidation;
using TKI.Application.Features.GameSessions.Commands.SubmitAnswer;

namespace TKI.Application.Features.GameSessions.Commands.SubmitAnswer;

public class SubmitAnswerCommandValidator : AbstractValidator<SubmitAnswerCommand>
{
    public SubmitAnswerCommandValidator()
    {
        RuleFor(x => x.GameSessionId)
            .NotEmpty().WithMessage("Oturum seçilmelidir.");

        RuleFor(x => x.PlayerId)
            .NotEmpty().WithMessage("Oyuncu seçilmelidir.");

        RuleFor(x => x.QuestionId)
            .NotEmpty().WithMessage("Soru seçilmelidir.");

        RuleFor(x => x.SelectedOptionId)
            .NotEmpty().WithMessage("Şık seçilmelidir.");

        RuleFor(x => x.ResponseTimeInSeconds)
            .GreaterThanOrEqualTo(0).WithMessage("Cevap süresi negatif olamaz.");
    }
}
