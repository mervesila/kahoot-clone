using Domain.Entities;
using MediatR;
using TKI.Application.Common.Interfaces;

namespace TKI.Application.Features.Quizzes.Commands;

public class CreateQuizCommandHandler : IRequestHandler<CreateQuizCommand, Guid>
{
    private readonly IApplicationDbContext _db;

    public CreateQuizCommandHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<Guid> Handle(
        CreateQuizCommand request,
        CancellationToken cancellationToken)
    {
        var quiz = new Quiz
        {
            Title = request.Title,
            Description = request.Description,
            IsActive = request.IsActive,
            CategoryId = request.CategoryId,
            Level = request.Level,
            PassScore = request.PassScore,
            DefaultTimeLimitInSeconds = request.DefaultTimeLimitInSeconds,
            JokersEnabled = request.JokersEnabled
        };

        _db.Quizzes.Add(quiz);
        await _db.SaveChangesAsync(cancellationToken);

        return quiz.Id;
    }
}
