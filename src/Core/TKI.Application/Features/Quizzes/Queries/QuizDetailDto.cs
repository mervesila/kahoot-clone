namespace TKI.Application.Features.Quizzes.Queries;

public class QuizDetailDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int? CategoryId { get; set; }
    public int Level { get; set; }
    public int PassScore { get; set; }
    public bool IsDynamic { get; set; }
    public int DefaultTimeLimitInSeconds { get; set; }
    public bool JokersEnabled { get; set; }
    public List<QuizQuestionDto> Questions { get; set; } = new();
}

public class QuizQuestionDto
{
    public Guid QuestionId { get; set; }
    public string Text { get; set; } = string.Empty;
    public int OrderNo { get; set; }
    public int TimeLimitInSeconds { get; set; }
    public int Points { get; set; }
    public int CategoryId { get; set; }
    public List<QuestionOptionDto> Options { get; set; } = new();
}

public class QuestionOptionDto
{
    public Guid OptionId { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
}
