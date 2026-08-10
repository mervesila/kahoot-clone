namespace Domain.Entities;

public class GameSessionQuestion
{
    public Guid GameSessionId { get; set; }
    public Guid QuestionId { get; set; }
    public int OrderNo { get; set; }

    public GameSession GameSession { get; set; } = null!;
    public Question Question { get; set; } = null!;
}
