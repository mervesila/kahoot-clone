namespace Domain.Entities;

using Domain.Common;

public class User : BaseEntity<Guid>
{
    public string RegistrationNumber { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Role { get; set; } = "Player";
    public string? TeamName { get; set; }
    public string? PasswordHash { get; set; }
    public string AvatarEmoji { get; set; } = "🦊";
    public string AvatarColor { get; set; } = "#e2257b";

    public ICollection<ParticipantAnswer> Answers { get; set; } = new List<ParticipantAnswer>();
    public ICollection<SessionParticipant> SessionParticipants { get; set; } = new List<SessionParticipant>();
}