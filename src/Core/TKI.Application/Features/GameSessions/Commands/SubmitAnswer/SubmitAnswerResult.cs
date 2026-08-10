namespace TKI.Application.Features.GameSessions.Commands.SubmitAnswer;

public class SubmitAnswerResult
{
    public Guid AnswerId { get; set; }
    public bool IsCorrect { get; set; }
    public int ScoreEarned { get; set; }
    public Guid CorrectOptionId { get; set; }
    public int ResponseTimeInSeconds { get; set; }
    public List<string> UsedJokers { get; set; } = new();
}
