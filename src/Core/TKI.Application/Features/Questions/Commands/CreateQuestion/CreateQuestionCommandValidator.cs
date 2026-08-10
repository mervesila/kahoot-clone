using FluentValidation;
using TKI.Application.Features.Questions.Commands.CreateQuestion;

namespace TKI.Application.Features.Questions.Commands.CreateQuestion;

public class CreateQuestionCommandValidator : AbstractValidator<CreateQuestionCommand>
{
    public CreateQuestionCommandValidator()
    {
        RuleFor(x => x.CategoryId)
            .GreaterThan(0).WithMessage("Geçerli bir kategori seçilmelidir.");

        RuleFor(x => x.Text)
            .NotEmpty().WithMessage("Soru metni boş olamaz.")
            .MaximumLength(1000).WithMessage("Soru metni en fazla 1000 karakter olabilir.");

        RuleFor(x => x.TargetRole)
            .NotEmpty().WithMessage("Hedef rol boş olamaz.");

        RuleFor(x => x.TimeLimitInSeconds)
            .InclusiveBetween(5, 120).WithMessage("Soru süresi 5 ile 120 saniye arasında olmalıdır.");

        RuleFor(x => x.Points)
            .GreaterThan(0).WithMessage("Puan sıfırdan büyük olmalıdır.");

        RuleFor(x => x.Options)
            .NotNull().WithMessage("Şıklar eklenmelidir.");

        When(x => x.Options != null, () =>
        {
            RuleFor(x => x.Options)
                .Must(o => o.Count >= 2).WithMessage("En az 2 şık eklenmelidir.");

            RuleFor(x => x.Options)
                .Must(o => o.Count(opt => opt.IsCorrect) == 1)
                .WithMessage("Tam olarak 1 doğru şık olmalıdır.");

            RuleForEach(x => x.Options)
                .Must(o => !string.IsNullOrWhiteSpace(o.Text))
                .WithMessage("Şık metni boş olamaz.");
        });
    }
}
