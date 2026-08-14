using Microsoft.AspNetCore.SignalR;
using TKI.Application.Common.Interfaces;
using TKI.Application.Features.GameSessions.Queries.GetSessionParticipants;
using TKI.WebAPI.Hubs;

namespace TKI.WebAPI.Services;

public class GameEventNotifier : IGameEventNotifier
{
    private readonly IHubContext<GameHub> _hub;

    public GameEventNotifier(IHubContext<GameHub> hub)
    {
        _hub = hub;
    }

    public Task PlayerJoinedAsync(PlayerJoinedEvent evt, CancellationToken cancellationToken = default)
        => SendToGroupAsync(evt.SessionId, "PlayerJoined", evt, cancellationToken);

    public Task GameStartedAsync(GameStartedEvent evt, CancellationToken cancellationToken = default)
        => SendToGroupAsync(evt.SessionId, "GameStarted", evt, cancellationToken);

    public Task QuestionStartedAsync(QuestionStartedEvent evt, CancellationToken cancellationToken = default)
        => SendToGroupAsync(evt.SessionId, "QuestionStarted", evt, cancellationToken);

    public Task GameStateChangedAsync(QuestionStartedEvent evt, CancellationToken cancellationToken = default)
        => SendToGroupAsync(evt.SessionId, "GameStateChanged", evt, cancellationToken);

    public Task AnswerSubmittedAsync(AnswerSubmittedEvent evt, CancellationToken cancellationToken = default)
        => SendToGroupAsync(evt.SessionId, "AnswerSubmitted", evt, cancellationToken);

    public Task JokerUsedAsync(JokerUsedEvent evt, CancellationToken cancellationToken = default)
        => SendToGroupAsync(evt.SessionId, "JokerUsed", evt, cancellationToken);

    public Task GameFinishedAsync(GameFinishedEvent evt, CancellationToken cancellationToken = default)
        => SendToGroupAsync(evt.SessionId, "GameFinished", evt, cancellationToken);

    public Task RoomPlayersUpdatedAsync(
        Guid sessionId,
        List<SessionParticipantDto> players,
        CancellationToken cancellationToken = default)
        => SendToGroupAsync(
            sessionId,
            "RoomPlayersUpdated",
            new { sessionId, players },
            cancellationToken);

    private async Task SendToGroupAsync(
        Guid sessionId,
        string method,
        object payload,
        CancellationToken cancellationToken)
    {
        try
        {
            await _hub.Clients
                .Group(sessionId.ToString())
                .SendAsync(method, payload, cancellationToken);
        }
        catch
        {
            // Gerçek zamanlı bildirim hataları oyun akışını etkilememelidir.
        }
    }
}
