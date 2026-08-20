namespace Domain.Entities;

using Domain.Common;

public class ExamAttempt : BaseEntity<Guid>
{
    public Guid? UserId { get; set; }
    public Guid QuizId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string RegistrationNumber { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
    public int TotalScore { get; set; }
    public int MaxPossibleScore { get; set; }
    public bool IsPassed { get; set; }
    public int CurrentQuestionIndex { get; set; }
    public string Status { get; set; } = "InProgress";
    public string? SelectedQuestionIds { get; set; }

    public User? User { get; set; }
    public Quiz Quiz { get; set; } = null!;
    public ICollection<ExamAnswer> Answers { get; set; } = new List<ExamAnswer>();
}
