namespace TKI.Application.Features.GameSessions.Queries.GetSessionParticipants;

public class SessionParticipantDto
{
    public Guid PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;
    public string? TeamName { get; set; }
    public string AvatarEmoji { get; set; } = "🦊";
    public string AvatarColor { get; set; } = "#e2257b";
}
