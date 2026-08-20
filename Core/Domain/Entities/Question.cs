namespace Domain.Entities;

using Domain.Common;

public class Question : BaseEntity<Guid>
{
    public int CategoryId { get; set; }
    public int Level { get; set; } = 1;
    public Guid? QuizId { get; set; }
    public string Text { get; set; } = string.Empty;
    public string? MediaUrl { get; set; }
    public string TargetRole { get; set; } = "All";
    public int TimeLimitInSeconds { get; set; } = 30;
    public int Points { get; set; } = 1000;
    public int OrderNo { get; set; }

    public Category Category { get; set; } = null!;
    public Quiz? Quiz { get; set; }
    public ICollection<Option> Options { get; set; } = new List<Option>();
}

public class Option : BaseEntity<Guid>
{
    public Guid QuestionId { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }

    public Question Question { get; set; } = null!;
}
