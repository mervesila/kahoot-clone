using Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common;
using TKI.Application.Common.Interfaces;
using TKI.Application.Exceptions;

namespace TKI.Application.Features.Categories.Commands.CreateCategory;

public class CreateCategoryCommandHandler : IRequestHandler<CreateCategoryCommand, int>
{
    private readonly IApplicationDbContext _db;

    public CreateCategoryCommandHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<int> Handle(
        CreateCategoryCommand request,
        CancellationToken cancellationToken)
    {
        var normalized = TitleNormalizer.Normalize(request.Name);

        var existingNames = await _db.Categories
            .Select(c => c.Name)
            .ToListAsync(cancellationToken);

        var exists = existingNames.Any(name =>
            string.Equals(TitleNormalizer.Normalize(name), normalized, StringComparison.Ordinal));

        if (exists)
        {
            throw new BusinessRuleException("Bu isimle bir kategori zaten mevcut.");
        }

        var category = new Category
        {
            Name = request.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description)
                ? null
                : request.Description.Trim(),
            IsActive = true
        };

        _db.Categories.Add(category);
        await _db.SaveChangesAsync(cancellationToken);

        return category.Id;
    }
}
