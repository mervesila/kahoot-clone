using Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common;
using TKI.Application.Common.Interfaces;
using TKI.Application.Exceptions;

namespace TKI.Application.Features.GameSessions.Commands.StartGameSession;

public class StartGameSessionCommandHandler : IRequestHandler<StartGameSessionCommand, GameSessionStateDto>
{
    private readonly IApplicationDbContext _db;
    private readonly IGameEventNotifier _notifier;

    public StartGameSessionCommandHandler(IApplicationDbContext db, IGameEventNotifier notifier)
    {
        _db = db;
        _notifier = notifier;
    }

    public async Task<GameSessionStateDto> Handle(
        StartGameSessionCommand request,
        CancellationToken cancellationToken)
    {
        var session = await _db.GameSessions
            .FirstOrDefaultAsync(s => s.Id == request.GameSessionId, cancellationToken)
            ?? throw new NotFoundException(nameof(GameSession), request.GameSessionId);

        if (session.Status != GameSessionStatuses.Waiting)
        {
            throw new BusinessRuleException("Oturum zaten başlatılmış veya bitmiş durumda.");
        }

        var firstQuestion = await _db.Questions
            .Where(q => q.QuizId == session.QuizId)
            .OrderBy(q => q.OrderNo)
            .Select(q => (int?)q.OrderNo)
            .FirstOrDefaultAsync(cancellationToken);

        session.Status = GameSessionStatuses.InGame;
        session.StartedAt = DateTime.UtcNow;
        session.CurrentQuestionOrderNo = firstQuestion ?? 0;

        await _db.SaveChangesAsync(cancellationToken);

        await _notifier.GameStartedAsync(
            new GameStartedEvent(session.Id, session.CurrentQuestionOrderNo),
            cancellationToken);

        if (session.CurrentQuestionOrderNo != 0)
        {
            var totalQuestions = await _db.Questions.CountAsync(
                q => q.QuizId == session.QuizId,
                cancellationToken);

            var questionInfo = await _db.Questions
                .AsNoTracking()
                .Where(q => q.QuizId == session.QuizId && q.OrderNo == session.CurrentQuestionOrderNo)
                .Select(q => new { q.TimeLimitInSeconds, q.Points })
                .FirstOrDefaultAsync(cancellationToken);

            await _notifier.QuestionStartedAsync(
                new QuestionStartedEvent(
                    session.Id,
                    session.CurrentQuestionOrderNo,
                    totalQuestions,
                    questionInfo?.TimeLimitInSeconds ?? 30,
                    questionInfo?.Points ?? 0),
                cancellationToken);
        }

        return ToDto(session);
    }

    private static GameSessionStateDto ToDto(GameSession session) => new()
    {
        Id = session.Id,
        Status = session.Status,
        CurrentQuestionOrderNo = session.CurrentQuestionOrderNo,
        StartedAt = session.StartedAt,
        FinishedAt = session.FinishedAt
    };
}
