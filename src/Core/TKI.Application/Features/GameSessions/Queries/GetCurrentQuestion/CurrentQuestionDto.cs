namespace TKI.Application.Features.GameSessions.Queries.GetCurrentQuestion;

public class CurrentQuestionDto
{
    public bool Answered { get; set; }
    public bool Finished { get; set; }
    public Guid? QuestionId { get; set; }
    public string Text { get; set; } = string.Empty;
    public int OrderNo { get; set; }
    public int TotalQuestions { get; set; }
    public int TimeLimitInSeconds { get; set; }
    public int Points { get; set; }
    public List<PlayerOptionDto> Options { get; set; } = new();

    public bool? IsCorrect { get; set; }
    public int? ScoreEarned { get; set; }
    public Guid? CorrectOptionId { get; set; }
    public List<string> UsedJokers { get; set; } = new();
    public bool JokersEnabled { get; set; } = true;
}

public class PlayerOptionDto
{
    public Guid OptionId { get; set; }
    public string Text { get; set; } = string.Empty;
}
