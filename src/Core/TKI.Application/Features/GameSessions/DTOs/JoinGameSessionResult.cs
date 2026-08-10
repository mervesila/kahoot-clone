namespace TKI.Application.Features.GameSessions.DTOs;

public class JoinGameSessionResult
{
    public Guid SessionId { get; set; }
    public string PinCode { get; set; } = string.Empty;
    public string QuizTitle { get; set; } = string.Empty;
    public Guid PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;
}
