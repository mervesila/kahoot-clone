namespace TKI.Application.Features.GameSessions.Queries.GetGameSessionReport;

public class GameSessionReportDto
{
    public Guid SessionId { get; set; }
    public Guid QuizId { get; set; }
    public string QuizTitle { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public bool IsTeamMode { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
    public List<ReportQuestionDto> Questions { get; set; } = new();
    public List<ReportPlayerDto> Players { get; set; } = new();
    public List<ReportTeamDto> Teams { get; set; } = new();
}

public class ReportQuestionDto
{
    public Guid QuestionId { get; set; }
    public string Text { get; set; } = string.Empty;
    public int OrderNo { get; set; }
    public int TotalAnswers { get; set; }
    public int CorrectCount { get; set; }
    public List<ReportOptionDto> Options { get; set; } = new();
}

public class ReportOptionDto
{
    public Guid OptionId { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    public int PickCount { get; set; }
}

public class ReportPlayerDto
{
    public Guid PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;
    public string? TeamName { get; set; }
    public int Score { get; set; }
    public int CorrectCount { get; set; }
    public int TotalAnswers { get; set; }
    public double Accuracy { get; set; }
}

public class ReportTeamDto
{
    public string TeamName { get; set; } = string.Empty;
    public double AverageScore { get; set; }
    public double TotalScore { get; set; }
    public int PlayerCount { get; set; }
}
