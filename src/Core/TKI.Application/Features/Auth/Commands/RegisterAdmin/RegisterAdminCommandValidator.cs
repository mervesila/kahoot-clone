using FluentValidation;

namespace TKI.Application.Features.Auth.Commands.RegisterAdmin;

public class RegisterAdminCommandValidator : AbstractValidator<RegisterAdminCommand>
{
    public RegisterAdminCommandValidator()
    {
        RuleFor(x => x.RegistrationNumber)
            .NotEmpty().WithMessage("Sicil numarası boş olamaz.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Parola boş olamaz.")
            .MinimumLength(6).WithMessage("Parola en az 6 karakter olmalıdır.");

        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("Ad boş olamaz.");

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Soyad boş olamaz.");

        RuleFor(x => x.Department)
            .NotEmpty().WithMessage("Departman boş olamaz.");
    }
}
