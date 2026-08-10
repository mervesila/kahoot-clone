namespace Domain.Entities;

using Domain.Common;

public class JokerUsage : BaseEntity<Guid>
{
    public Guid GameSessionId { get; set; }
    public Guid UserId { get; set; }
    public Guid QuestionId { get; set; }
    public string JokerType { get; set; } = string.Empty;

    public GameSession GameSession { get; set; } = null!;
    public User User { get; set; } = null!;
    public Question Question { get; set; } = null!;
}
