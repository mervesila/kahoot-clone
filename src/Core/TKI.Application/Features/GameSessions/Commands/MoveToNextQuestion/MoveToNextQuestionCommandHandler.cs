using Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common;
using TKI.Application.Common.Interfaces;
using TKI.Application.Exceptions;
using TKI.Application.Features.GameSessions.Commands;

namespace TKI.Application.Features.GameSessions.Commands.MoveToNextQuestion;

public class MoveToNextQuestionCommandHandler : IRequestHandler<MoveToNextQuestionCommand, GameSessionStateDto>
{
    private readonly IApplicationDbContext _db;
    private readonly IGameEventNotifier _notifier;

    public MoveToNextQuestionCommandHandler(IApplicationDbContext db, IGameEventNotifier notifier)
    {
        _db = db;
        _notifier = notifier;
    }

    public async Task<GameSessionStateDto> Handle(
        MoveToNextQuestionCommand request,
        CancellationToken cancellationToken)
    {
        var session = await _db.GameSessions
            .FirstOrDefaultAsync(s => s.Id == request.GameSessionId, cancellationToken)
            ?? throw new NotFoundException(nameof(GameSession), request.GameSessionId);

        if (session.Status != GameSessionStatuses.InGame)
        {
            throw new BusinessRuleException("Oturum başlatılmadığı için soru ilerletilemez.");
        }

        var nextOrderNo = await _db.GameSessionQuestions
            .Where(gsq => gsq.GameSessionId == session.Id && gsq.OrderNo > session.CurrentQuestionOrderNo)
            .OrderBy(gsq => gsq.OrderNo)
            .Select(gsq => (int?)gsq.OrderNo)
            .FirstOrDefaultAsync(cancellationToken);

        if (nextOrderNo is null)
        {
            throw new BusinessRuleException("Daha fazla soru yok. Oturumu bitirebilirsiniz.");
        }

        session.CurrentQuestionOrderNo = nextOrderNo.Value;

        await _db.SaveChangesAsync(cancellationToken);

        await _notifier.QuestionStartedAsync(
            await QuestionStartedEventBuilder.BuildAsync(_db, session, cancellationToken),
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
}
