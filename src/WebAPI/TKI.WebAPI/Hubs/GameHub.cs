using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common.Interfaces;
using TKI.Application.Features.GameSessions.Queries.GetSessionParticipants;

namespace TKI.WebAPI.Hubs;

public class GameHub : Hub
{
    private readonly IApplicationDbContext _db;
    private readonly IGameEventNotifier _notifier;

    public GameHub(IApplicationDbContext db, IGameEventNotifier notifier)
    {
        _db = db;
        _notifier = notifier;
    }

    public async Task JoinGameGroup(Guid sessionId)
    {
        var exists = await _db.GameSessions.AnyAsync(s => s.Id == sessionId);
        if (!exists)
        {
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, sessionId.ToString());
    }

    public async Task LeaveGameGroup(Guid sessionId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, sessionId.ToString());
    }

    public async Task UpdatePlayerAvatar(Guid sessionId, Guid playerId, string emoji, string color)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == playerId);
        if (user is not null)
        {
            user.AvatarEmoji = string.IsNullOrWhiteSpace(emoji) ? user.AvatarEmoji : emoji.Trim();
            user.AvatarColor = string.IsNullOrWhiteSpace(color) ? user.AvatarColor : color.Trim();
            await _db.SaveChangesAsync();
        }

        await Clients.Group(sessionId.ToString()).SendAsync(
            "PlayerAvatarUpdated",
            new { sessionId, playerId, emoji, color });

        var players = await _db.SessionParticipants
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
            .ToListAsync();

        await _notifier.RoomPlayersUpdatedAsync(sessionId, players);
    }
}
