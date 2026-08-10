using Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common.Interfaces;
using TKI.Application.Exceptions;

namespace TKI.Application.Features.Quizzes.Commands.ImportQuestionPool;

public class ImportQuestionPoolCommandHandler : IRequestHandler<ImportQuestionPoolCommand, Guid>
{
    private readonly IApplicationDbContext _db;

    public ImportQuestionPoolCommandHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<Guid> Handle(
        ImportQuestionPoolCommand request,
        CancellationToken cancellationToken)
    {
        var category = await _db.Categories
            .FirstOrDefaultAsync(
                c => c.Name.ToLower() == request.CategoryName.ToLower(),
                cancellationToken);

        if (category is null)
        {
            category = new Category { Name = request.CategoryName };
            _db.Categories.Add(category);
            await _db.SaveChangesAsync(cancellationToken);
        }

        if (request.Questions.Count == 0)
        {
            throw new BusinessRuleException("İçe aktarılacak soru bulunamadı.");
        }

        var quiz = new Quiz
        {
            Title = request.Title,
            Description = request.Description,
            IsActive = true
        };

        var orderNo = 1;

        foreach (var item in request.Questions)
        {
            var question = new Question
            {
                CategoryId = category.Id,
                Quiz = quiz,
                OrderNo = orderNo++,
                Text = item.Text,
                TargetRole = "All",
                TimeLimitInSeconds = 30,
                Points = 1000,
                Options = item.Options
                    .Select((text, index) => new Option
                    {
                        Text = text,
                        IsCorrect = index == item.CorrectIndex
                    })
                    .ToList()
            };

            _db.Questions.Add(question);
        }

        _db.Quizzes.Add(quiz);
        await _db.SaveChangesAsync(cancellationToken);

        return quiz.Id;
    }
}
