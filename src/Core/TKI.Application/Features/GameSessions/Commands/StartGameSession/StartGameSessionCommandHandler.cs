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

        var firstQuestion = await _db.GameSessionQuestions
            .Where(gsq => gsq.GameSessionId == session.Id)
            .OrderBy(gsq => gsq.OrderNo)
            .Select(gsq => (int?)gsq.OrderNo)
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
            await _notifier.QuestionStartedAsync(
                await QuestionStartedEventBuilder.BuildAsync(_db, session, cancellationToken),
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
