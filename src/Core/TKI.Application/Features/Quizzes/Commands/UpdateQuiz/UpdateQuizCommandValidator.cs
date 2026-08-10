using FluentValidation;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common;
using TKI.Application.Common.Interfaces;

namespace TKI.Application.Features.Quizzes.Commands.UpdateQuiz;

public class UpdateQuizCommandValidator : AbstractValidator<UpdateQuizCommand>
{
    private readonly IApplicationDbContext _db;

    public UpdateQuizCommandValidator(IApplicationDbContext db)
    {
        _db = db;

        RuleFor(x => x.Id)
            .NotEmpty().WithMessage("Quiz kimliği zorunludur.");

        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Quiz başlığı boş olamaz.")
            .MaximumLength(200).WithMessage("Quiz başlığı en fazla 200 karakter olabilir.")
            .MustAsync(IsUniqueAsync)
            .WithMessage("Bu isim kullanılamaz çünkü böyle bir sınav zaten var.");

        RuleFor(x => x.Description)
            .MaximumLength(1000).WithMessage("Quiz açıklaması en fazla 1000 karakter olabilir.");

        RuleFor(x => x.CategoryId)
            .GreaterThan(0).WithMessage("Geçerli bir kategori seçilmelidir.")
            .When(x => x.CategoryId is not null);

        RuleFor(x => x.Level)
            .Must(level => level is 1 or 2).WithMessage("Seviye yalnızca 1 veya 2 olabilir.");

        RuleFor(x => x.PassScore)
            .InclusiveBetween(0, 100).WithMessage("Geçme notu 0 ile 100 arasında olmalıdır.");

        RuleFor(x => x.DefaultTimeLimitInSeconds)
            .InclusiveBetween(5, 120).WithMessage("Varsayılan soru süresi 5 ile 120 saniye arasında olmalıdır.");
    }

    private async Task<bool> IsUniqueAsync(
        UpdateQuizCommand command,
        string title,
        CancellationToken cancellationToken)
    {
        var normalized = TitleNormalizer.Normalize(title);
        var existingTitles = await _db.Quizzes
            .Where(q => q.Id != command.Id)
            .Select(q => q.Title)
            .ToListAsync(cancellationToken);

        return !existingTitles.Any(existing =>
            string.Equals(
                TitleNormalizer.Normalize(existing),
                normalized,
                StringComparison.Ordinal));
    }
}
