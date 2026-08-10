using Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common;
using TKI.Application.Common.Interfaces;
using TKI.Application.Exceptions;
using TKI.Application.Features.GameSessions.Queries.GetCurrentQuestion;

namespace TKI.Application.Features.GameSessions.Queries.GetCurrentQuestion;

public class GetCurrentQuestionQueryHandler : IRequestHandler<GetCurrentQuestionQuery, CurrentQuestionDto>
{
    private readonly IApplicationDbContext _db;

    public GetCurrentQuestionQueryHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<CurrentQuestionDto> Handle(
        GetCurrentQuestionQuery request,
        CancellationToken cancellationToken)
    {
        var session = await _db.GameSessions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == request.GameSessionId, cancellationToken)
            ?? throw new NotFoundException(nameof(GameSession), request.GameSessionId);

        var totalQuestions = await _db.GameSessionQuestions
            .CountAsync(gsq => gsq.GameSessionId == session.Id, cancellationToken);

        var jokersEnabled = await _db.Quizzes
            .AsNoTracking()
            .Where(q => q.Id == session.QuizId)
            .Select(q => q.JokersEnabled)
            .FirstOrDefaultAsync(cancellationToken);

        if (session.Status == GameSessionStatuses.Finished)
        {
            return new CurrentQuestionDto { Finished = true, TotalQuestions = totalQuestions };
        }

        if (session.Status != GameSessionStatuses.InGame || session.CurrentQuestionOrderNo == 0)
        {
            throw new BusinessRuleException("Oyun henüz başlamadı.");
        }

        var question = await _db.GameSessionQuestions
            .AsNoTracking()
            .Include(gsq => gsq.Question)
                .ThenInclude(q => q.Options)
            .Where(gsq => gsq.GameSessionId == session.Id
                && gsq.OrderNo == session.CurrentQuestionOrderNo)
            .Select(gsq => gsq.Question)
            .FirstOrDefaultAsync(cancellationToken);

        if (question is null)
        {
            throw new BusinessRuleException("Aktif soru bulunamadı.");
        }

        var answered = await _db.ParticipantAnswers
            .AsNoTracking()
            .FirstOrDefaultAsync(
                pa => pa.GameSessionId == request.GameSessionId
                      && pa.UserId == request.PlayerId
                      && pa.QuestionId == question.Id,
                cancellationToken);

        var options = question.Options
            .OrderBy(o => o.Id)
            .Select(o => new PlayerOptionDto
            {
                OptionId = o.Id,
                Text = o.Text
            })
            .ToList();

        var usedFiftyFifty = await _db.JokerUsages.AnyAsync(
            j => j.GameSessionId == request.GameSessionId
                 && j.UserId == request.PlayerId
                 && j.QuestionId == question.Id
                 && j.JokerType == JokerTypes.FiftyFifty,
            cancellationToken);

        if (usedFiftyFifty && answered is null)
        {
            options = FilterFiftyFifty(options, question.Options.ToList());
        }

        var usedJokers = await _db.JokerUsages
            .AsNoTracking()
            .Where(
                j => j.GameSessionId == request.GameSessionId
                     && j.UserId == request.PlayerId)
            .Select(j => j.JokerType)
            .Distinct()
            .ToListAsync(cancellationToken);

        var result = new CurrentQuestionDto
        {
            Answered = answered is not null,
            Finished = false,
            QuestionId = question.Id,
            Text = question.Text,
            OrderNo = question.OrderNo,
            TotalQuestions = totalQuestions,
            TimeLimitInSeconds = question.TimeLimitInSeconds,
            Points = question.Points,
            Options = options,
            UsedJokers = usedJokers,
            JokersEnabled = jokersEnabled
        };

        if (answered is not null)
        {
            var correctOption = question.Options.First(o => o.IsCorrect);
            result.IsCorrect = answered.SelectedOptionId == correctOption.Id;
            result.ScoreEarned = answered.ScoreEarned;
            result.CorrectOptionId = correctOption.Id;
        }

        return result;
    }

    private static List<PlayerOptionDto> FilterFiftyFifty(
        List<PlayerOptionDto> options,
        List<Option> sourceOptions)
    {
        var correct = options.First(o => sourceOptions.First(s => s.Id == o.OptionId).IsCorrect);
        var wrongs = options.Where(o => !sourceOptions.First(s => s.Id == o.OptionId).IsCorrect).ToList();
        var keptWrong = wrongs[Random.Shared.Next(wrongs.Count)];

        return new[] { correct, keptWrong }
            .OrderBy(o => o.OptionId)
            .ToList();
    }
}
