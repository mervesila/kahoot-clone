using FluentValidation;
using TKI.Application.Features.GameSessions.Commands.JoinGameSession;

namespace TKI.Application.Features.GameSessions.Commands.JoinGameSession;

public class JoinGameSessionCommandValidator : AbstractValidator<JoinGameSessionCommand>
{
    public JoinGameSessionCommandValidator()
    {
        RuleFor(x => x.PinCode)
            .NotEmpty().WithMessage("PIN kodu boş olamaz.")
            .Matches(@"^\d{6}$").WithMessage("PIN kodu 6 haneli olmalıdır.");

        RuleFor(x => x.RegistrationNumber)
            .NotEmpty().WithMessage("Sicil numarası boş olamaz.");

        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("Ad boş olamaz.");

        RuleFor(x => x.LastName)
            .MaximumLength(50);

        RuleFor(x => x.Department)
            .NotEmpty().WithMessage("Departman boş olamaz.");
    }
}
