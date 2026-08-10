using FluentValidation;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common;
using TKI.Application.Common.Interfaces;
using TKI.Application.Features.Quizzes.Commands;

namespace TKI.Application.Features.Quizzes.Commands;

public class CreateQuizCommandValidator : AbstractValidator<CreateQuizCommand>
{
    private readonly IApplicationDbContext _db;

    public CreateQuizCommandValidator(IApplicationDbContext db)
    {
        _db = db;

        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Quiz başlığı boş olamaz.")
            .MaximumLength(200).WithMessage("Quiz başlığı en fazla 200 karakter olabilir.")
            .MustAsync(IsUniqueAsync)
            .WithMessage("Bu isim kullanılamaz çünkü böyle bir sınav zaten var.");

        RuleFor(x => x.Description)
            .MaximumLength(1000).WithMessage("Quiz açıklaması en fazla 1000 karakter olabilir.");

        RuleFor(x => x.Level)
            .Must(level => level is 1 or 2).WithMessage("Seviye yalnızca 1 veya 2 olabilir.");

        RuleFor(x => x.PassScore)
            .InclusiveBetween(0, 100).WithMessage("Geçme notu 0 ile 100 arasında olmalıdır.");
    }

    private async Task<bool> IsUniqueAsync(
        string title,
        CancellationToken cancellationToken)
    {
        var normalized = TitleNormalizer.Normalize(title);
        var existingTitles = await _db.Quizzes
            .Select(q => q.Title)
            .ToListAsync(cancellationToken);

        return !existingTitles.Any(existing =>
            string.Equals(
                TitleNormalizer.Normalize(existing),
                normalized,
                StringComparison.Ordinal));
    }
}
