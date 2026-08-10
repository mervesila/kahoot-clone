using System.Text.Json;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace TKI.Persistence;

public static class DbInitializer
{
    private static readonly (string Name, string Description)[] SeedCategories =
    {
        ("İş Sağlığı ve Güvenliği", "İş sağlığı, güvenlik ve çevre kuralları, riskler ve koruyucu önlemler"),
        ("TKİ / Kurum Kültürü", "TKİ kurum değerleri, tarihçesi, mevzuat ve kurum içi bilgi kültürü"),
        ("Madencilik", "Maden üretim süreçleri, teknik operasyonlar ve işletme bilgisi"),
        ("Bilgi Teknolojileri ve Siber Güvenlik", "Bilişim sistemleri, veri güvenliği ve siber güvenlik farkındalığı"),
        ("İnsan Kaynakları ve İdari İşler", "Personel süreçleri, özlük işleri ve idari yönetim"),
        ("Mali İşler ve Satın Alma", "Finansal yönetim, satınalma ve ihale mevzuatı"),
        ("Kalite ve Verimlilik", "Kalite standartları, süreç iyileştirme ve verimlilik"),
        ("Genel Kültür ve Oryantasyon", "Genel kültür soruları ve kuruma yeni başlayanlar için oryantasyon"),
        ("Genel Kurumsal", "Kurum genelini ilgilendiren çapraz bilgi ve beceri soruları")
    };

    private sealed class PoolFile
    {
        public List<PoolCategory> Categories { get; set; } = new();
    }

    private sealed class PoolCategory
    {
        public string Name { get; set; } = string.Empty;
        public List<PoolQuestion> Questions { get; set; } = new();
    }

    private sealed class PoolQuestion
    {
        public string Text { get; set; } = string.Empty;
        public List<string> Options { get; set; } = new();
        public int CorrectIndex { get; set; }
    }

    public static async Task SeedAsync(AppDbContext context)
    {
        await context.Database.MigrateAsync();

        await SeedCategoriesAsync(context);
        await SeedQuestionPoolAsync(context);
        await SeedExampleQuizzesAsync(context);
    }

    private static async Task SeedCategoriesAsync(AppDbContext context)
    {
        var existingNames = await context.Categories
            .Select(c => c.Name)
            .ToListAsync();

        var toAdd = SeedCategories
            .Where(s => !existingNames.Contains(s.Name))
            .Select(s => new Category { Name = s.Name, Description = s.Description })
            .ToList();

        if (toAdd.Count > 0)
        {
            context.Categories.AddRange(toAdd);
        }

        await context.SaveChangesAsync();
    }

    private static async Task SeedQuestionPoolAsync(AppDbContext context)
    {
        if (await context.Questions.AnyAsync())
        {
            return;
        }

        var poolFile = LoadPoolFile();
        if (poolFile is null)
        {
            return;
        }

        var categories = await context.Categories
            .ToDictionaryAsync(c => c.Name);

        foreach (var poolCategory in poolFile.Categories)
        {
            if (!categories.TryGetValue(poolCategory.Name, out var category))
            {
                continue;
            }

            foreach (var item in poolCategory.Questions)
            {
                context.Questions.Add(new Question
                {
                    CategoryId = category.Id,
                    QuizId = null,
                    OrderNo = 0,
                    Text = item.Text,
                    TargetRole = "All",
                    TimeLimitInSeconds = 30,
                    Points = 1000,
                    Options = item.Options
                        .Select((text, index) => new Option
                        {
                            Text = text,
                            IsCorrect = index == item.CorrectIndex
                        })
                        .ToList()
                });
            }
        }

        await context.SaveChangesAsync();
    }

    private static async Task SeedExampleQuizzesAsync(AppDbContext context)
    {
        var categories = await context.Categories
            .AsNoTracking()
            .ToListAsync();

        foreach (var category in categories)
        {
            var poolQuestions = await context.Questions
                .Where(q => q.CategoryId == category.Id && q.QuizId == null)
                .OrderBy(q => q.Text)
                .ToListAsync();

            if (poolQuestions.Count == 0)
            {
                continue;
            }

            var levelOneCount = (poolQuestions.Count + 1) / 2;
            var levelOneQuestions = poolQuestions.Take(levelOneCount).ToList();
            var levelTwoQuestions = poolQuestions.Skip(levelOneCount).ToList();

            if (!await context.Quizzes.AnyAsync(q => q.CategoryId == category.Id && q.Level == 1))
            {
                await CreateQuizAsync(
                    context,
                    $"{category.Name} – Seviye 1",
                    category.Id,
                    1,
                    levelOneQuestions);
            }

            if (levelTwoQuestions.Count > 0
                && !await context.Quizzes.AnyAsync(q => q.CategoryId == category.Id && q.Level == 2))
            {
                await CreateQuizAsync(
                    context,
                    $"{category.Name} – Seviye 2",
                    category.Id,
                    2,
                    levelTwoQuestions);
            }
        }
    }

    private static async Task CreateQuizAsync(
        AppDbContext context,
        string title,
        int categoryId,
        int level,
        List<Question> questions)
    {
        var quiz = new Quiz
        {
            Title = title,
            Description = $"Bu sınav, {title} kategorisi için seviye {level} sınavıdır.",
            IsActive = true,
            CategoryId = categoryId,
            Level = level,
            PassScore = 70,
            DefaultTimeLimitInSeconds = 30,
            JokersEnabled = true
        };

        var orderNo = 1;
        foreach (var question in questions)
        {
            question.Quiz = quiz;
            question.OrderNo = orderNo++;
        }

        context.Quizzes.Add(quiz);
        await context.SaveChangesAsync();
    }

    private static PoolFile? LoadPoolFile()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Data", "question-pool.json");
        if (!File.Exists(path))
        {
            return null;
        }

        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<PoolFile>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
    }
}
