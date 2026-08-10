namespace Domain.Entities;

using Domain.Common;

public class Category : BaseEntity<int>
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    
    public ICollection<Question> Questions { get; set; } = new List<Question>();
}