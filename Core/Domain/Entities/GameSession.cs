namespace Domain.Entities;

using Domain.Common;

public class GameSession : BaseEntity<Guid>
{
    public Guid QuizId { get; set; }
    public string PinCode { get; set; } = string.Empty;
    public string Status { get; set; } = "Waiting";
    public bool IsTeamMode { get; set; }
    public int CurrentQuestionOrderNo { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
    
    public Quiz Quiz { get; set; } = null!;
    public ICollection<ParticipantAnswer> ParticipantAnswers { get; set; } = new List<ParticipantAnswer>();
    public ICollection<JokerUsage> JokerUsages { get; set; } = new List<JokerUsage>();
    public ICollection<SessionParticipant> SessionParticipants { get; set; } = new List<SessionParticipant>();
}