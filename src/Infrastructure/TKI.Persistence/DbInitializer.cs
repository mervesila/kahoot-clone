using System.Security.Cryptography;
using System.Text.Json;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace TKI.Persistence;

public static class DbInitializer
{
    private static readonly (string Name, string Description)[] SeedCategories =
    {
        ("İSG", "İş sağlığı ve güvenliği soru havuzu: İSG kuralları, riskler ve koruyucu önlemler"),
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

    private const string SeedAdminRegistrationNumber = "admin1";
    private const string SeedAdminDefaultPassword = "1234567A";

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
        await SeedAdminAsync(context);
        await SeedQuestionPoolAsync(context);
        await SeedLevelQuizzesAsync(context);
        await MigrateQuestionLevelsAsync(context);
    }

    private static async Task SeedAdminAsync(AppDbContext context)
    {
        var existing = await context.Users.FirstOrDefaultAsync(
            u => u.RegistrationNumber == SeedAdminRegistrationNumber);

        var passwordHash = HashPassword(SeedAdminDefaultPassword);

        if (existing is not null)
        {
            if (existing.PasswordHash != passwordHash)
            {
                existing.PasswordHash = passwordHash;
                await context.SaveChangesAsync();
            }
            return;
        }

        context.Users.Add(new User
        {
            RegistrationNumber = SeedAdminRegistrationNumber,
            FirstName = "Merve Sıla",
            LastName = "Akyol",
            Department = "Yönetim",
            Role = "Admin",
            PasswordHash = passwordHash
        });

        await context.SaveChangesAsync();
    }

    private static string HashPassword(string password)
    {
        const int iterations = 100_000;
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            iterations,
            HashAlgorithmName.SHA256,
            32);
        return $"{iterations}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
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

        var isgCategory = await context.Categories
            .FirstOrDefaultAsync(c => c.Name == "İSG");

        if (isgCategory is null)
        {
            return;
        }

        var poolFile = LoadPoolFile();
        if (poolFile is not null)
        {
            foreach (var poolCategory in poolFile.Categories)
            {
                foreach (var item in poolCategory.Questions)
                {
                    context.Questions.Add(new Question
                    {
                        CategoryId = isgCategory.Id,
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
        }
        else
        {
            var fallbackQuestions = new (string Text, string[] Options, int CorrectIndex)[]
            {
                ("Bir iş kazasında ilk yapılması gereken nedir?",
                    new[] { "Olay yerini terk etmek", "Yaralıya müdahale etmek", "Güvenliği sağlamak ve yetkililere bildirmek", "Kaza raporu doldurmak" }, 2),
                ("Yangın söndürme tüpü hangi durumda kullanılır?",
                    new[] { "Küçük çaplı yangınlarda", "Her türlü yangında", "Yalnızca elektrik yangınlarında", "Yalnızca gaz yangınlarında" }, 0),
                ("Kişisel Koruyucu Donanım (KDD) ne işe yarar?",
                    new[] { "Çalışanın iş verimini artırır", "İşyerinin temizliğini sağlar", "Meslek hastalıklarını ve iş kazalarını önlemeye yardımcı olur", "Sadece görsel bir zorunluluktur" }, 2),
                ("ISG kanununa göre работодательın en temel yükümlülüğü nedir?",
                    new[] { "İşçi maaşlarını zamanında ödemek", "İş sağlığı ve güvenliği önlemlerini almak", "Yıllık izin vermek", "Servis aracı sağlamak" }, 1),
                ("Risk değerlendirmesi hangi sıklıkla yapılmalıdır?",
                    new[] { "Her yıl", "İş yerinde risk değişikliği olduğunda veya en az yılda bir", "Yalnızca işe başlarken", "Hiçbir zaman" }, 1),
                ("Elektrik çarpmasında ilk yapılması gereken nedir?",
                    new[] { "Yaralıyı hemen kaldırmak", "Elektrik kaynağını kesmek veya izole etmek", "Yaralıya su dökmek", "Hemen suni teneffüs yapmak" }, 1),
                ("Yüksekte çalışırken hangi önlem alınmalıdır?",
                    new[] { "Sadece başında baret olması yeterlidir", "Düşme riskini önleyecek koruyucu ekipman ve tedbirler alınmalıdır", "Hızlı çalışmak yeterlidir", "Tek başına çalışılabilir" }, 1),
                ("Kimyasal madde ile çalışırken hangi koruyucu ekipmanlar kullanılmalıdır?",
                    new[] { "Yalnızca eldiven", "Gözlük, eldiven, gerekirse respiratör ve koruyucu önlük", "Sadece maske", "Hiçbir ekipman gerekmez" }, 1),
                ("İş yerinde acil durum planı hazırlanması zorunlu mudur?",
                    new[] { "Hayır, isteğe bağlıdır", "Evet, işveren tarafından hazırlanması zorunludur", "Yalnızca büyük iş yerlerinde zorunludur", "Devlet tarafından hazırlanır" }, 1),
                ("Bir WORKER ortalama kaç saat çalışmalıdır, dinlenme süresi ne kadardır?",
                    new[] { "8 saat çalışma, 1 saat dinlenme", "Günde 11 saate kadar çalışabilir, dinlenme zorunlu değildir", "7.5 saatten fazla çalıştırılamaz, dinlenme süresi verilmelidir", "Sınırsız çalışma serbesttir" }, 2),
            };

            foreach (var (text, options, correctIndex) in fallbackQuestions)
            {
                context.Questions.Add(new Question
                {
                    CategoryId = isgCategory.Id,
                    QuizId = null,
                    OrderNo = 0,
                    Text = text,
                    TargetRole = "All",
                    TimeLimitInSeconds = 30,
                    Points = 1000,
                    Options = options
                        .Select((optText, index) => new Option
                        {
                            Text = optText,
                            IsCorrect = index == correctIndex
                        })
                        .ToList()
                });
            }
        }

        await context.SaveChangesAsync();
    }

    private static async Task SeedLevelQuizzesAsync(AppDbContext context)
    {
        var isgCategoryId = await context.Categories
            .Where(c => c.Name == "İSG")
            .Select(c => (int?)c.Id)
            .FirstOrDefaultAsync();

        var level1Quiz = await context.Quizzes
            .FirstOrDefaultAsync(q => q.Level == 1);

        if (level1Quiz is null)
        {
            level1Quiz = new Quiz
            {
                Title = LevelOneQuizTitle,
                Description = "50 soruluk İSG havuzundan her oturumda rastgele 10 soru ile dinamik olarak uygulanan seviye 1 sınavı.",
                IsActive = true,
                CategoryId = isgCategoryId,
                Level = 1,
                PassScore = PassScore,
                DefaultTimeLimitInSeconds = 30,
                JokersEnabled = true
            };
            context.Quizzes.Add(level1Quiz);
            await context.SaveChangesAsync();
        }

        var l1LinkedCount = await context.Questions.CountAsync(q => q.QuizId == level1Quiz.Id);
        if (l1LinkedCount < 10)
        {
            var linkedIds = await context.Questions
                .Where(q => q.QuizId == level1Quiz.Id)
                .Select(q => q.Id)
                .ToListAsync();

            var poolQuestions = await context.Questions
                .Where(q => q.CategoryId == isgCategoryId && q.QuizId == null && !linkedIds.Contains(q.Id))
                .OrderBy(q => q.Id)
                .Take(10 - l1LinkedCount)
                .ToListAsync();

            foreach (var q in poolQuestions)
            {
                q.QuizId = level1Quiz.Id;
                q.Level = 1;
                q.OrderNo = l1LinkedCount + poolQuestions.IndexOf(q) + 1;
            }
            await context.SaveChangesAsync();
        }

        var level2Quiz = await context.Quizzes
            .FirstOrDefaultAsync(q => q.Level == 2);

        if (level2Quiz is null)
        {
            level2Quiz = new Quiz
            {
                Title = LevelTwoQuizTitle,
                Description = "Seviye 1'de en az %70 puan alanların katılabildiği, kalan havuzdan rastgele 10 soru ile uygulanan seviye 2 sınavı.",
                IsActive = true,
                CategoryId = isgCategoryId,
                Level = 2,
                PassScore = PassScore,
                DefaultTimeLimitInSeconds = 30,
                JokersEnabled = true
            };
            context.Quizzes.Add(level2Quiz);
            await context.SaveChangesAsync();
        }

        var l2LinkedCount = await context.Questions.CountAsync(q => q.QuizId == level2Quiz.Id);
        if (l2LinkedCount < 10)
        {
            var linkedIds = await context.Questions
                .Where(q => q.QuizId == level2Quiz.Id)
                .Select(q => q.Id)
                .ToListAsync();

            var poolQuestions = await context.Questions
                .Where(q => q.CategoryId == isgCategoryId && q.QuizId == null && !linkedIds.Contains(q.Id))
                .OrderBy(q => q.Id)
                .Take(10 - l2LinkedCount)
                .ToListAsync();

            foreach (var q in poolQuestions)
            {
                q.QuizId = level2Quiz.Id;
                q.Level = 2;
                q.OrderNo = l2LinkedCount + poolQuestions.IndexOf(q) + 1;
            }
            await context.SaveChangesAsync();
        }
    }

    private static async Task MigrateQuestionLevelsAsync(AppDbContext context)
    {
        var questionsWithQuiz = await context.Questions
            .Include(q => q.Quiz)
            .Where(q => q.QuizId != null && q.Level == 0)
            .ToListAsync();

        foreach (var q in questionsWithQuiz)
        {
            if (q.Quiz != null)
            {
                q.Level = q.Quiz.Level;
            }
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
