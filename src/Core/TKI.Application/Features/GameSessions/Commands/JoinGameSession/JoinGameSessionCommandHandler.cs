using Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common;
using TKI.Application.Common.Interfaces;
using TKI.Application.Exceptions;
using TKI.Application.Features.GameSessions.DTOs;
using TKI.Application.Features.GameSessions.Queries.GetSessionParticipants;

namespace TKI.Application.Features.GameSessions.Commands.JoinGameSession;

public class JoinGameSessionCommandHandler : IRequestHandler<JoinGameSessionCommand, JoinGameSessionResult>
{
    private readonly IApplicationDbContext _db;
    private readonly IGameEventNotifier _notifier;

    public JoinGameSessionCommandHandler(IApplicationDbContext db, IGameEventNotifier notifier)
    {
        _db = db;
        _notifier = notifier;
    }

    public async Task<JoinGameSessionResult> Handle(
        JoinGameSessionCommand request,
        CancellationToken cancellationToken)
    {
        var session = await _db.GameSessions
            .AsNoTracking()
            .FirstOrDefaultAsync(
                gs => gs.PinCode == request.PinCode
                      && gs.Status == GameSessionStatuses.Waiting,
                cancellationToken);

        if (session is null)
        {
            throw new NotFoundException(nameof(GameSession), request.PinCode);
        }

        var quiz = await _db.Quizzes
            .AsNoTracking()
            .Where(q => q.Id == session.QuizId)
            .Select(q => new { q.Level })
            .FirstOrDefaultAsync(cancellationToken);

        if (quiz is null)
        {
            throw new NotFoundException(nameof(Quiz), session.QuizId);
        }

        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.RegistrationNumber == request.RegistrationNumber, cancellationToken);

        var requestedName = $"{request.FirstName} {request.LastName}".Trim();

        var participants = await _db.SessionParticipants
            .Where(sp => sp.GameSessionId == session.Id)
            .Select(sp => new { sp.UserId, Name = sp.User.FirstName + " " + sp.User.LastName })
            .ToListAsync(cancellationToken);

        var nameTaken = participants.Any(p =>
            p.UserId != user?.Id
            && !string.IsNullOrWhiteSpace(p.Name)
            && string.Equals(p.Name.Trim(), requestedName, StringComparison.OrdinalIgnoreCase));

        if (nameTaken)
        {
            throw new NicknameConflictException(
                "Bu isim bu odada zaten kullanılıyor. Lütfen farklı bir isim seçin.");
        }

        var requestedAvatarEmoji = string.IsNullOrWhiteSpace(request.AvatarEmoji)
            ? "🦊"
            : request.AvatarEmoji.Trim();
        var requestedAvatarColor = string.IsNullOrWhiteSpace(request.AvatarColor)
            ? "#e2257b"
            : request.AvatarColor.Trim();

        if (user is null)
        {
            user = new User
            {
                RegistrationNumber = request.RegistrationNumber,
                FirstName = request.FirstName,
                LastName = request.LastName,
                Department = request.Department,
                Role = "Player",
                TeamName = request.TeamName,
                AvatarEmoji = requestedAvatarEmoji,
                AvatarColor = requestedAvatarColor
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync(cancellationToken);
        }
        else
        {
            var avatarChanged =
                user.AvatarEmoji != requestedAvatarEmoji || user.AvatarColor != requestedAvatarColor;

            if ((!string.IsNullOrWhiteSpace(request.TeamName) && user.TeamName != request.TeamName)
                || avatarChanged)
            {
                user.TeamName = string.IsNullOrWhiteSpace(request.TeamName)
                    ? user.TeamName
                    : request.TeamName;
                user.AvatarEmoji = requestedAvatarEmoji;
                user.AvatarColor = requestedAvatarColor;
                await _db.SaveChangesAsync(cancellationToken);
            }
        }

        if (quiz.Level == 2)
        {
            var passedLevelOne = await _db.UserQuizResults
                .AsNoTracking()
                .Where(r => r.UserId == user.Id
                    && r.IsPassed
                    && r.Quiz.Level == 1)
                .AnyAsync(cancellationToken);

            if (!passedLevelOne)
            {
                throw new BusinessRuleException("Önce 1. Seviye Sınavı tamamlamalısınız.");
            }
        }

        var alreadyJoined = await _db.SessionParticipants.AnyAsync(
            sp => sp.GameSessionId == session.Id && sp.UserId == user.Id,
            cancellationToken);

        if (!alreadyJoined)
        {
            _db.SessionParticipants.Add(new SessionParticipant
            {
                GameSessionId = session.Id,
                UserId = user.Id
            });

            await _db.SaveChangesAsync(cancellationToken);
        }

        await _notifier.PlayerJoinedAsync(
            new PlayerJoinedEvent(
                session.Id,
                user.Id,
                $"{user.FirstName} {user.LastName}",
                user.TeamName),
            cancellationToken);

        var updatedPlayers = await GetParticipantsAsync(session.Id, cancellationToken);
        await _notifier.RoomPlayersUpdatedAsync(session.Id, updatedPlayers, cancellationToken);

        var quizTitle = await _db.Quizzes
            .Where(q => q.Id == session.QuizId)
            .Select(q => q.Title)
            .FirstOrDefaultAsync(cancellationToken) ?? string.Empty;

        return new JoinGameSessionResult
        {
            SessionId = session.Id,
            PinCode = session.PinCode,
            QuizTitle = quizTitle,
            PlayerId = user.Id,
            PlayerName = $"{user.FirstName} {user.LastName}".Trim()
        };
    }

    private async Task<List<SessionParticipantDto>> GetParticipantsAsync(
        Guid sessionId,
        CancellationToken cancellationToken)
    {
        return await _db.SessionParticipants
            .AsNoTracking()
            .Where(sp => sp.GameSessionId == sessionId)
            .OrderBy(sp => sp.JoinedAt)
            .Select(sp => new SessionParticipantDto
            {
                PlayerId = sp.UserId,
                PlayerName = (sp.User.FirstName + " " + sp.User.LastName).Trim(),
                TeamName = sp.User.TeamName,
                AvatarEmoji = sp.User.AvatarEmoji,
                AvatarColor = sp.User.AvatarColor
            })
            .ToListAsync(cancellationToken);
    }
}
