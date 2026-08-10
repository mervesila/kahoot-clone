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

    private const string LevelOneQuizTitle = "İSG Seviye 1";
    private const string LevelTwoQuizTitle = "İSG Seviye 2";
    private const int PassScore = 70;

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
        await SeedLevelQuizzesAsync(context);
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

    private static async Task SeedLevelQuizzesAsync(AppDbContext context)
    {
        if (!await context.Quizzes.AnyAsync(q => q.Level == 1))
        {
            context.Quizzes.Add(new Quiz
            {
                Title = LevelOneQuizTitle,
                Description = "50 soruluk İSG havuzundan her oturumda rastgele 10 soru ile dinamik olarak uygulanan seviye 1 sınavı.",
                IsActive = true,
                Level = 1,
                PassScore = PassScore,
                DefaultTimeLimitInSeconds = 30,
                JokersEnabled = true
            });
        }

        if (!await context.Quizzes.AnyAsync(q => q.Level == 2))
        {
            context.Quizzes.Add(new Quiz
            {
                Title = LevelTwoQuizTitle,
                Description = "Seviye 1'de en az %70 puan alanların katılabildiği, kalan havuzdan rastgele 10 soru ile uygulanan seviye 2 sınavı.",
                IsActive = true,
                Level = 2,
                PassScore = PassScore,
                DefaultTimeLimitInSeconds = 30,
                JokersEnabled = true
            });
        }

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
