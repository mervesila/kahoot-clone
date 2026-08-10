using Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common.Interfaces;
using TKI.Application.Exceptions;

namespace TKI.Application.Features.Quizzes.Queries;

public class GetQuizByIdQueryHandler : IRequestHandler<GetQuizByIdQuery, QuizDetailDto>
{
    private readonly IApplicationDbContext _db;

    public GetQuizByIdQueryHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<QuizDetailDto> Handle(
        GetQuizByIdQuery request,
        CancellationToken cancellationToken)
    {
        var quiz = await _db.Quizzes
            .AsNoTracking()
            .Where(q => q.Id == request.QuizId)
            .Select(q => new QuizDetailDto
            {
                Id = q.Id,
                Title = q.Title,
                Description = q.Description,
                IsActive = q.IsActive,
                CategoryId = q.CategoryId,
                Level = q.Level,
                PassScore = q.PassScore,
                DefaultTimeLimitInSeconds = q.DefaultTimeLimitInSeconds,
                JokersEnabled = q.JokersEnabled,
                Questions = q.Questions
                    .OrderBy(question => question.OrderNo)
                    .Select(question => new QuizQuestionDto
                    {
                        QuestionId = question.Id,
                        Text = question.Text,
                        OrderNo = question.OrderNo,
                        TimeLimitInSeconds = question.TimeLimitInSeconds,
                        Points = question.Points,
                        CategoryId = question.CategoryId,
                        Options = question.Options
                            .OrderBy(o => o.Id)
                            .Select(o => new QuestionOptionDto
                            {
                                OptionId = o.Id,
                                Text = o.Text,
                                IsCorrect = o.IsCorrect
                            })
                            .ToList()
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (quiz is null)
        {
            throw new NotFoundException(nameof(Quiz), request.QuizId);
        }

        return quiz;
    }
}
