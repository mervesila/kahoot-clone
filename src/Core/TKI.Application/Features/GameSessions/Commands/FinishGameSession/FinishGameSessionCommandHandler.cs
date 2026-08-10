using Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common;
using TKI.Application.Common.Interfaces;
using TKI.Application.Exceptions;
using TKI.Application.Features.GameSessions.Commands;

namespace TKI.Application.Features.GameSessions.Commands.FinishGameSession;

public class FinishGameSessionCommandHandler : IRequestHandler<FinishGameSessionCommand, GameSessionStateDto>
{
    private readonly IApplicationDbContext _db;
    private readonly IGameEventNotifier _notifier;

    public FinishGameSessionCommandHandler(IApplicationDbContext db, IGameEventNotifier notifier)
    {
        _db = db;
        _notifier = notifier;
    }

    public async Task<GameSessionStateDto> Handle(
        FinishGameSessionCommand request,
        CancellationToken cancellationToken)
    {
        var session = await _db.GameSessions
            .FirstOrDefaultAsync(s => s.Id == request.GameSessionId, cancellationToken)
            ?? throw new NotFoundException(nameof(GameSession), request.GameSessionId);

        if (session.Status != GameSessionStatuses.InGame)
        {
            throw new BusinessRuleException("Yalnızca başlatılmış oturumlar bitirilebilir.");
        }

        var quiz = await _db.Quizzes
            .AsNoTracking()
            .Where(q => q.Id == session.QuizId)
            .Select(q => new { q.PassScore })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException(nameof(Quiz), session.QuizId);

        session.Status = GameSessionStatuses.Finished;
        session.FinishedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        await WriteQuizResultsAsync(session, quiz.PassScore, cancellationToken);

        await _notifier.GameFinishedAsync(
            new GameFinishedEvent(session.Id),
            cancellationToken);

        return new GameSessionStateDto
        {
            Id = session.Id,
            Status = session.Status,
            CurrentQuestionOrderNo = session.CurrentQuestionOrderNo,
            StartedAt = session.StartedAt,
            FinishedAt = session.FinishedAt
        };
    }

    private async Task WriteQuizResultsAsync(
        GameSession session,
        int passScore,
        CancellationToken cancellationToken)
    {
        var answers = await _db.ParticipantAnswers
            .AsNoTracking()
            .Where(pa => pa.GameSessionId == session.Id)
            .GroupBy(pa => pa.UserId)
            .Select(g => new
            {
                UserId = g.Key,
                Score = g.Sum(pa => pa.ScoreEarned)
            })
            .ToListAsync(cancellationToken);

        var maxPossibleScore = await _db.GameSessionQuestions
            .AsNoTracking()
            .Where(gsq => gsq.GameSessionId == session.Id)
            .SumAsync(gsq => (int?)gsq.Question.Points, cancellationToken) ?? 0;

        var participants = await _db.SessionParticipants
            .AsNoTracking()
            .Where(sp => sp.GameSessionId == session.Id)
            .Select(sp => sp.UserId)
            .ToListAsync(cancellationToken);

        var completedAt = DateTime.UtcNow;

        var existingResults = await _db.UserQuizResults
            .Where(r => r.QuizId == session.QuizId && participants.Contains(r.UserId))
            .ToDictionaryAsync(r => r.UserId, cancellationToken);

        foreach (var userId in participants)
        {
            var score = answers.FirstOrDefault(a => a.UserId == userId)?.Score ?? 0;
            var percentage = maxPossibleScore > 0
                ? (int)Math.Round((double)score / maxPossibleScore * 100)
                : 0;

            if (existingResults.TryGetValue(userId, out var existing))
            {
                existing.Score = percentage;
                existing.IsPassed = percentage >= passScore;
                existing.CompletedAt = completedAt;
                continue;
            }

            _db.UserQuizResults.Add(new UserQuizResult
            {
                UserId = userId,
                QuizId = session.QuizId,
                Score = percentage,
                IsPassed = percentage >= passScore,
                CompletedAt = completedAt
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
    }
}
