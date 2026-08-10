namespace TKI.Application.Features.GameSessions.Queries.GetScoreboard;

public class ScoreboardDto
{
    public Guid SessionId { get; set; }
    public string QuizTitle { get; set; } = string.Empty;
    public bool IsTeamMode { get; set; }
    public List<ScoreboardPlayerDto> Individual { get; set; } = new();
    public List<ScoreboardTeamDto> Teams { get; set; } = new();
}

public class ScoreboardPlayerDto
{
    public Guid PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;
    public string? TeamName { get; set; }
    public int Score { get; set; }
    public int CorrectCount { get; set; }
    public int TotalAnswers { get; set; }
}

public class ScoreboardTeamDto
{
    public string TeamName { get; set; } = string.Empty;
    public double AverageScore { get; set; }
    public double TotalScore { get; set; }
    public int PlayerCount { get; set; }
}
