namespace TKI.Application.Features.GameSessions.Commands;

public class GameSessionStateDto
{
    public Guid Id { get; set; }
    public string Status { get; set; } = string.Empty;
    public int CurrentQuestionOrderNo { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
}
