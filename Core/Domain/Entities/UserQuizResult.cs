namespace Domain.Entities;

using Domain.Common;

public class UserQuizResult : BaseEntity<Guid>
{
    public Guid UserId { get; set; }
    public Guid QuizId { get; set; }
    public int Score { get; set; }
    public bool IsPassed { get; set; }
    public DateTime CompletedAt { get; set; }

    public User User { get; set; } = null!;
    public Quiz Quiz { get; set; } = null!;
}
