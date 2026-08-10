namespace TKI.Application.Features.Categories.Queries;

public class CategoryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int QuestionCount { get; set; }
}
