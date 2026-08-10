using Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common;
using TKI.Application.Common.Interfaces;
using TKI.Application.Exceptions;

namespace TKI.Application.Features.GameSessions.Commands.UseJoker;

public class UseJokerCommandHandler : IRequestHandler<UseJokerCommand>
{
    private readonly IApplicationDbContext _db;
    private readonly IGameEventNotifier _notifier;

    public UseJokerCommandHandler(IApplicationDbContext db, IGameEventNotifier notifier)
    {
        _db = db;
        _notifier = notifier;
    }

    public async Task Handle(
        UseJokerCommand request,
        CancellationToken cancellationToken)
    {
        var session = await _db.GameSessions
            .FirstOrDefaultAsync(s => s.Id == request.GameSessionId, cancellationToken)
            ?? throw new NotFoundException(nameof(GameSession), request.GameSessionId);

        if (session.Status != GameSessionStatuses.InGame)
        {
            throw new BusinessRuleException("Oturum başlatılmadığı için joker kullanılamaz.");
        }

        var quiz = await _db.Quizzes
            .AsNoTracking()
            .FirstOrDefaultAsync(q => q.Id == session.QuizId, cancellationToken);

        if (quiz is not null && !quiz.JokersEnabled)
        {
            throw new BusinessRuleException("Bu quizde joker kullanımı devre dışı bırakılmıştır.");
        }

        var question = await _db.Questions
            .FirstOrDefaultAsync(q => q.Id == request.QuestionId, cancellationToken)
            ?? throw new NotFoundException(nameof(Question), request.QuestionId);

        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Id == request.PlayerId, cancellationToken)
            ?? throw new NotFoundException(nameof(User), request.PlayerId);

        var alreadyAnswered = await _db.ParticipantAnswers.AnyAsync(
            pa => pa.GameSessionId == request.GameSessionId
                  && pa.UserId == request.PlayerId
                  && pa.QuestionId == request.QuestionId,
            cancellationToken);

        if (alreadyAnswered)
        {
            throw new BusinessRuleException("Cevap gönderildikten sonra joker kullanılamaz.");
        }

        var alreadyUsed = await _db.JokerUsages.AnyAsync(
            j => j.GameSessionId == request.GameSessionId
                 && j.UserId == request.PlayerId
                 && j.JokerType == request.JokerType,
            cancellationToken);

        if (alreadyUsed)
        {
            throw new BusinessRuleException("Bu joker bu sınavda zaten kullanıldı.");
        }

        _db.JokerUsages.Add(new JokerUsage
        {
            GameSessionId = request.GameSessionId,
            UserId = request.PlayerId,
            QuestionId = request.QuestionId,
            JokerType = request.JokerType
        });

        await _db.SaveChangesAsync(cancellationToken);

        await _notifier.JokerUsedAsync(
            new JokerUsedEvent(request.GameSessionId, request.PlayerId, request.JokerType),
            cancellationToken);
    }
}
