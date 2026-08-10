using FluentValidation;
using TKI.Application.Common;
using TKI.Application.Features.GameSessions.Commands.UseJoker;

namespace TKI.Application.Features.GameSessions.Commands.UseJoker;

public class UseJokerCommandValidator : AbstractValidator<UseJokerCommand>
{
    public UseJokerCommandValidator()
    {
        RuleFor(x => x.GameSessionId)
            .NotEmpty().WithMessage("Oturum seçilmelidir.");

        RuleFor(x => x.PlayerId)
            .NotEmpty().WithMessage("Oyuncu seçilmelidir.");

        RuleFor(x => x.QuestionId)
            .NotEmpty().WithMessage("Soru seçilmelidir.");

        RuleFor(x => x.JokerType)
            .NotEmpty().WithMessage("Joker türü boş olamaz.")
            .Must(JokerTypes.All.Contains)
            .WithMessage($"Joker türü {string.Join(", ", JokerTypes.All)} değerlerinden biri olmalıdır.");
    }
}
