using FluentValidation;
using TKI.Application.Features.GameSessions.Commands.StartGameSession;

namespace TKI.Application.Features.GameSessions.Commands.StartGameSession;

public class StartGameSessionCommandValidator : AbstractValidator<StartGameSessionCommand>
{
    public StartGameSessionCommandValidator()
    {
        RuleFor(x => x.GameSessionId)
            .NotEmpty().WithMessage("Oturum seçilmelidir.");
    }
}
