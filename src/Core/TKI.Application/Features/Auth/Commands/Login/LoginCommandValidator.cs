using FluentValidation;

namespace TKI.Application.Features.Auth.Commands.Login;

public class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.RegistrationNumber)
            .NotEmpty().WithMessage("Sicil numarası boş olamaz.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Parola boş olamaz.");
    }
}
