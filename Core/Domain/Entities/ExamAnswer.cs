namespace Domain.Entities;

using Domain.Common;

public class ExamAnswer : BaseEntity<Guid>
{
    public Guid ExamAttemptId { get; set; }
    public Guid QuestionId { get; set; }
    public Guid? SelectedOptionId { get; set; }
    public int TimeSpentMs { get; set; }
    public int ScoreEarned { get; set; }
    public bool IsCorrect { get; set; }
    public int QuestionIndex { get; set; }

    public ExamAttempt ExamAttempt { get; set; } = null!;
    public Question Question { get; set; } = null!;
    public Option? SelectedOption { get; set; }
}
