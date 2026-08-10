using Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common;
using TKI.Application.Common.Interfaces;
using TKI.Application.Exceptions;

namespace TKI.Application.Features.GameSessions.Commands.SubmitAnswer;

public class SubmitAnswerCommandHandler : IRequestHandler<SubmitAnswerCommand, SubmitAnswerResult>
{
    private readonly IApplicationDbContext _db;
    private readonly IGameEventNotifier _notifier;

    public SubmitAnswerCommandHandler(IApplicationDbContext db, IGameEventNotifier notifier)
    {
        _db = db;
        _notifier = notifier;
    }

    public async Task<SubmitAnswerResult> Handle(
        SubmitAnswerCommand request,
        CancellationToken cancellationToken)
    {
        var session = await _db.GameSessions
            .FirstOrDefaultAsync(s => s.Id == request.GameSessionId, cancellationToken)
            ?? throw new NotFoundException(nameof(GameSession), request.GameSessionId);

        if (session.Status != GameSessionStatuses.InGame)
        {
            throw new BusinessRuleException("Oturum başlatılmadığı için cevap gönderilemez.");
        }

        var question = await _db.Questions
            .AsNoTracking()
            .Include(q => q.Options)
            .FirstOrDefaultAsync(q => q.Id == request.QuestionId, cancellationToken)
            ?? throw new NotFoundException(nameof(Question), request.QuestionId);

        var quizQuestion = await _db.Questions
            .AsNoTracking()
            .FirstOrDefaultAsync(
                q => q.QuizId == session.QuizId && q.Id == request.QuestionId,
                cancellationToken);

        if (quizQuestion is null || quizQuestion.OrderNo != session.CurrentQuestionOrderNo)
        {
            throw new BusinessRuleException("Gönderilen soru aktif soru ile eşleşmiyor.");
        }

        var selectedOption = question.Options.FirstOrDefault(o => o.Id == request.SelectedOptionId)
            ?? throw new NotFoundException(nameof(Option), request.SelectedOptionId);

        var existing = await _db.ParticipantAnswers
            .FirstOrDefaultAsync(
                pa => pa.GameSessionId == request.GameSessionId
                      && pa.UserId == request.PlayerId
                      && pa.QuestionId == request.QuestionId,
                cancellationToken);

        if (existing is not null)
        {
            var correctOption = question.Options.First(o => o.IsCorrect);
            return new SubmitAnswerResult
            {
                AnswerId = existing.Id,
                IsCorrect = existing.SelectedOptionId == correctOption.Id,
                ScoreEarned = existing.ScoreEarned,
                CorrectOptionId = correctOption.Id,
                ResponseTimeInSeconds = existing.ResponseTimeInSeconds
            };
        }

        var usedJokers = await _db.JokerUsages
            .Where(
                j => j.GameSessionId == request.GameSessionId
                     && j.UserId == request.PlayerId
                     && j.QuestionId == request.QuestionId)
            .Select(j => j.JokerType)
            .ToListAsync(cancellationToken);

        var score = CalculateScore(question, selectedOption, request.ResponseTimeInSeconds, usedJokers);

        var answer = new ParticipantAnswer
        {
            GameSessionId = request.GameSessionId,
            UserId = request.PlayerId,
            QuestionId = request.QuestionId,
            SelectedOptionId = request.SelectedOptionId,
            ResponseTimeInSeconds = Math.Clamp(request.ResponseTimeInSeconds, 0, int.MaxValue),
            ScoreEarned = score
        };

        _db.ParticipantAnswers.Add(answer);
        await _db.SaveChangesAsync(cancellationToken);

        var playerName = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == request.PlayerId)
            .Select(u => $"{u.FirstName} {u.LastName}")
            .FirstOrDefaultAsync(cancellationToken) ?? string.Empty;

        var newTotalScore = await _db.ParticipantAnswers
            .Where(
                pa => pa.GameSessionId == request.GameSessionId
                      && pa.UserId == request.PlayerId)
            .SumAsync(pa => (int?)pa.ScoreEarned, cancellationToken) ?? 0;

        await _notifier.AnswerSubmittedAsync(
            new AnswerSubmittedEvent(
                request.GameSessionId,
                request.PlayerId,
                playerName,
                selectedOption.IsCorrect,
                score,
                newTotalScore),
            cancellationToken);

        var correctOptionId = question.Options.First(o => o.IsCorrect).Id;

        return new SubmitAnswerResult
        {
            AnswerId = answer.Id,
            IsCorrect = selectedOption.IsCorrect,
            ScoreEarned = score,
            CorrectOptionId = correctOptionId,
            ResponseTimeInSeconds = answer.ResponseTimeInSeconds,
            UsedJokers = usedJokers
        };
    }

    private static int CalculateScore(
        Question question,
        Option selectedOption,
        int responseTimeInSeconds,
        List<string> usedJokers)
    {
        if (!selectedOption.IsCorrect)
        {
            return 0;
        }

        var timeLimit = question.TimeLimitInSeconds;
        if (usedJokers.Contains(JokerTypes.ExtraTime))
        {
            timeLimit += GameplayConstants.ExtraTimeSeconds;
        }

        var effectiveResponseTime = Math.Clamp(responseTimeInSeconds, 0, timeLimit);
        var timeFactor = 1.0 - ((double)effectiveResponseTime / timeLimit) * GameplayConstants.TimePenaltyFactor;
        var score = (int)Math.Round(question.Points * timeFactor);

        if (usedJokers.Contains(JokerTypes.DoublePoints))
        {
            score *= 2;
        }

        return Math.Max(0, score);
    }
}
