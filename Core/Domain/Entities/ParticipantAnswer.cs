namespace Domain.Entities;

using Domain.Common;

public class ParticipantAnswer : BaseEntity<Guid>
{
    public Guid GameSessionId { get; set; }
    public Guid UserId { get; set; }
    public Guid QuestionId { get; set; }
    public Guid SelectedOptionId { get; set; }
    public int ResponseTimeInSeconds { get; set; }
    public int ScoreEarned { get; set; }

    public GameSession GameSession { get; set; } = null!;
    public User User { get; set; } = null!;
    public Question Question { get; set; } = null!;
    public Option SelectedOption { get; set; } = null!;
}