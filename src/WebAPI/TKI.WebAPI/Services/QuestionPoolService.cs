using System.Text.Json;

namespace TKI.WebAPI.Services;

public class QuestionPoolDto
{
    public List<QuestionPoolCategoryDto> Categories { get; set; } = new();
}

public class QuestionPoolCategoryDto
{
    public string Name { get; set; } = string.Empty;
    public List<QuestionPoolQuestionDto> Questions { get; set; } = new();
}

public class QuestionPoolQuestionDto
{
    public string Text { get; set; } = string.Empty;
    public List<string> Options { get; set; } = new();
    public int CorrectIndex { get; set; }
}

public class QuestionPoolService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly ILogger<QuestionPoolService> _logger;
    private readonly QuestionPoolDto _pool;

    public QuestionPoolService(IHostEnvironment environment, ILogger<QuestionPoolService> logger)
    {
        _logger = logger;
        _pool = LoadPool(environment.ContentRootPath);
    }

    public QuestionPoolDto GetPool() => _pool;

    public QuestionPoolCategoryDto? FindCategory(string name) =>
        _pool.Categories.FirstOrDefault(c => string.Equals(c.Name, name, StringComparison.OrdinalIgnoreCase));

    private QuestionPoolDto LoadPool(string contentRoot)
    {
        var path = Path.Combine(contentRoot, "Data", "question-pool.json");
        try
        {
            if (File.Exists(path))
            {
                var json = File.ReadAllText(path);
                var pool = JsonSerializer.Deserialize<QuestionPoolDto>(json, JsonOptions);
                if (pool is not null)
                {
                    return pool;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Soru havuzu dosyası okunamadı: {Path}", path);
        }

        _logger.LogWarning("Soru havuzu bulunamadı, boş havuz kullanılacak: {Path}", path);
        return new QuestionPoolDto();
    }
}
