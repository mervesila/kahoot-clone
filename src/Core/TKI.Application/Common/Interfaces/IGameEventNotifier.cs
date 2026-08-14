using TKI.Application.Features.GameSessions.Queries.GetSessionParticipants;

namespace TKI.Application.Common.Interfaces;

public record PlayerJoinedEvent(Guid SessionId, Guid PlayerId, string PlayerName, string? TeamName);

public record GameStartedEvent(Guid SessionId, int FirstQuestionOrderNo);

public record QuestionStartedOption(string OptionId, string Text);

public record QuestionStartedEvent(
    Guid SessionId,
    int OrderNo,
    int TotalQuestions,
    int TimeLimitInSeconds,
    int Points,
    Guid QuestionId,
    string Text,
    List<QuestionStartedOption> Options,
    bool JokersEnabled);

public record AnswerSubmittedEvent(
    Guid SessionId,
    Guid PlayerId,
    string PlayerName,
    bool IsCorrect,
    int ScoreEarned,
    int NewTotalScore);

public record JokerUsedEvent(Guid SessionId, Guid PlayerId, string JokerType);

public record GameFinishedEvent(Guid SessionId);

public interface IGameEventNotifier
{
    Task PlayerJoinedAsync(PlayerJoinedEvent evt, CancellationToken cancellationToken = default);
    Task GameStartedAsync(GameStartedEvent evt, CancellationToken cancellationToken = default);
    Task QuestionStartedAsync(QuestionStartedEvent evt, CancellationToken cancellationToken = default);
    Task AnswerSubmittedAsync(AnswerSubmittedEvent evt, CancellationToken cancellationToken = default);
    Task JokerUsedAsync(JokerUsedEvent evt, CancellationToken cancellationToken = default);
    Task GameFinishedAsync(GameFinishedEvent evt, CancellationToken cancellationToken = default);
    Task RoomPlayersUpdatedAsync(Guid sessionId, List<SessionParticipantDto> players, CancellationToken cancellationToken = default);
}
