using Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common.Interfaces;
using TKI.Application.Exceptions;

namespace TKI.Application.Features.Quizzes.Commands.UpdateQuiz;

public class UpdateQuizCommandHandler : IRequestHandler<UpdateQuizCommand>
{
    private readonly IApplicationDbContext _db;

    public UpdateQuizCommandHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task Handle(
        UpdateQuizCommand request,
        CancellationToken cancellationToken)
    {
        var quiz = await _db.Quizzes
            .FirstOrDefaultAsync(q => q.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Quiz), request.Id);

        if (request.CategoryId is not null
            && !await _db.Categories.AnyAsync(c => c.Id == request.CategoryId, cancellationToken))
        {
            throw new NotFoundException(nameof(Category), request.CategoryId.Value);
        }

        quiz.Title = request.Title;
        quiz.Description = request.Description;
        quiz.IsActive = request.IsActive;
        quiz.CategoryId = request.CategoryId;
        quiz.Level = request.Level;
        quiz.PassScore = request.PassScore;
        quiz.DefaultTimeLimitInSeconds = request.DefaultTimeLimitInSeconds;
        quiz.JokersEnabled = request.JokersEnabled;

        await _db.SaveChangesAsync(cancellationToken);
    }
}
