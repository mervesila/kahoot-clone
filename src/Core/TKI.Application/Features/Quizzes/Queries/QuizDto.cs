namespace TKI.Application.Features.Quizzes.Queries;

public class QuizDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int QuestionCount { get; set; }
    public int? CategoryId { get; set; }
    public int Level { get; set; }
    public int PassScore { get; set; }
    public bool IsDynamic { get; set; }
    public int DefaultTimeLimitInSeconds { get; set; }
    public bool JokersEnabled { get; set; }
}
