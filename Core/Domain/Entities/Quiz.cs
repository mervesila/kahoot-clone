namespace Domain.Entities;

using Domain.Common;

public class Quiz : BaseEntity<Guid>
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int? CategoryId { get; set; }
    public int Level { get; set; } = 1;
    public int PassScore { get; set; } = 70;
    public int DefaultTimeLimitInSeconds { get; set; } = 30;
    public bool JokersEnabled { get; set; } = true;

    public Category? Category { get; set; }
    public ICollection<Question> Questions { get; set; } = new List<Question>();
    public ICollection<GameSession> GameSessions { get; set; } = new List<GameSession>();
    public ICollection<UserQuizResult> UserQuizResults { get; set; } = new List<UserQuizResult>();
}
