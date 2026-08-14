using Microsoft.EntityFrameworkCore;
using TKI.Application.Common;
using TKI.Application.Common.Interfaces;
using TKI.Application.Features.GameSessions.Commands;

namespace TKI.WebAPI.Services;

public class GameHeartbeatService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly TimeSpan _interval = TimeSpan.FromSeconds(2);

    public GameHeartbeatService(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(_interval, stoppingToken);
                await BroadcastStateAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch
            {
                // Kalp atışı yayın hataları oyun akışını etkilememelidir.
            }
        }
    }

    private async Task BroadcastStateAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
        var notifier = scope.ServiceProvider.GetRequiredService<IGameEventNotifier>();

        var activeSessions = await db.GameSessions
            .AsNoTracking()
            .Where(s => s.Status == GameSessionStatuses.InGame)
            .Select(s => s.Id)
            .ToListAsync(cancellationToken);

        foreach (var sessionId in activeSessions)
        {
            var state = await QuestionStartedEventBuilder.BuildByIdAsync(db, sessionId, cancellationToken);
            await notifier.GameStateChangedAsync(state, cancellationToken);
        }
    }
}
