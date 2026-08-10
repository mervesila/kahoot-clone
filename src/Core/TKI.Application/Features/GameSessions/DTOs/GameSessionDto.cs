namespace TKI.Application.Features.GameSessions.DTOs;

public class GameSessionDto
{
    public Guid Id { get; set; }
    public Guid QuizId { get; set; }
    public string PinCode { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}
