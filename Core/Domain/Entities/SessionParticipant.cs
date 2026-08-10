namespace Domain.Entities;

using Domain.Common;

public class SessionParticipant : BaseEntity<Guid>
{
    public Guid GameSessionId { get; set; }
    public Guid UserId { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    public GameSession GameSession { get; set; } = null!;
    public User User { get; set; } = null!;
}
