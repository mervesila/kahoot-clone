using MediatR;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common.Interfaces;
using TKI.Application.Exceptions;

namespace TKI.Application.Features.GameSessions.Queries.GetGameSessionQuestions;

public class GetGameSessionQuestionsQueryHandler
    : IRequestHandler<GetGameSessionQuestionsQuery, List<SessionQuestionDto>>
{
    private readonly IApplicationDbContext _db;

    public GetGameSessionQuestionsQueryHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<List<SessionQuestionDto>> Handle(
        GetGameSessionQuestionsQuery request,
        CancellationToken cancellationToken)
    {
        var sessionExists = await _db.GameSessions
            .AsNoTracking()
            .AnyAsync(s => s.Id == request.GameSessionId, cancellationToken);

        if (!sessionExists)
        {
            throw new NotFoundException(nameof(GameSessions), request.GameSessionId);
        }

        return await _db.GameSessionQuestions
            .AsNoTracking()
            .Where(gsq => gsq.GameSessionId == request.GameSessionId)
            .OrderBy(gsq => gsq.OrderNo)
            .Select(gsq => new SessionQuestionDto
            {
                QuestionId = gsq.QuestionId,
                Text = gsq.Question.Text,
                CategoryName = gsq.Question.Category != null ? gsq.Question.Category.Name : string.Empty,
                OrderNo = gsq.OrderNo,
                TimeLimitInSeconds = gsq.Question.TimeLimitInSeconds,
                Points = gsq.Question.Points,
                Options = gsq.Question.Options
                    .OrderBy(o => o.Id)
                    .Select(o => new SessionQuestionOptionDto
                    {
                        OptionId = o.Id,
                        Text = o.Text,
                        IsCorrect = o.IsCorrect
                    })
                    .ToList()
            })
            .ToListAsync(cancellationToken);
    }
}
