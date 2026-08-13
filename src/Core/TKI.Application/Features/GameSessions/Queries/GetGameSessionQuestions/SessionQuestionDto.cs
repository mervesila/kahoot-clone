namespace TKI.Application.Features.GameSessions.Queries.GetGameSessionQuestions;

public class SessionQuestionDto
{
    public Guid QuestionId { get; set; }
    public string Text { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public int OrderNo { get; set; }
    public int TimeLimitInSeconds { get; set; }
    public int Points { get; set; }
    public List<SessionQuestionOptionDto> Options { get; set; } = new();
}

public class SessionQuestionOptionDto
{
    public Guid OptionId { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
}
