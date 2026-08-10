using MediatR;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common.Interfaces;

namespace TKI.Application.Features.Quizzes.Queries;

public class GetAllQuizzesQueryHandler : IRequestHandler<GetAllQuizzesQuery, List<QuizDto>>
{
    private readonly IApplicationDbContext _db;

    public GetAllQuizzesQueryHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<List<QuizDto>> Handle(
        GetAllQuizzesQuery request,
        CancellationToken cancellationToken)
    {
        return await _db.Quizzes
            .AsNoTracking()
            .OrderByDescending(q => q.CreatedAt)
            .Select(q => new QuizDto
            {
                Id = q.Id,
                Title = q.Title,
                Description = q.Description,
                IsActive = q.IsActive,
                QuestionCount = q.Questions.Count,
                CategoryId = q.CategoryId,
                Level = q.Level,
                PassScore = q.PassScore,
                DefaultTimeLimitInSeconds = q.DefaultTimeLimitInSeconds,
                JokersEnabled = q.JokersEnabled
            })
            .ToListAsync(cancellationToken);
    }
}
