using FluentValidation;
using TKI.Application.Features.GameSessions.Commands.FinishGameSession;

namespace TKI.Application.Features.GameSessions.Commands.FinishGameSession;

public class FinishGameSessionCommandValidator : AbstractValidator<FinishGameSessionCommand>
{
    public FinishGameSessionCommandValidator()
    {
        RuleFor(x => x.GameSessionId)
            .NotEmpty().WithMessage("Oturum seçilmelidir.");
    }
}
