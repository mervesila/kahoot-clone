using Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common.Interfaces;

namespace TKI.WebAPI.Controllers.Player;

[Route("api/exam")]
public class ExamController : PlayerBaseController
{
    private readonly IApplicationDbContext _db;
    private const int TimeLimitPerQuestionSeconds = 40;

    public ExamController(IApplicationDbContext db) => _db = db;

    [HttpPost("start")]
    public async Task<IActionResult> StartExam([FromBody] StartExamRequest request)
    {
        var quiz = await _db.Quizzes
            .Include(q => q.Questions.OrderBy(o => o.OrderNo)).ThenInclude(q => q.Options)
            .FirstOrDefaultAsync(q => q.Id == request.QuizId);

        if (quiz == null) return NotFound("Sınav bulunamadı.");
        if (!quiz.IsActive) return BadRequest("Bu sınavın süresi dolmuş veya erişime kapatılmıştır.");
        if (!quiz.Questions.Any()) return BadRequest("Soru bulunmuyor.");

        var attempt = new ExamAttempt
        {
            Id = Guid.NewGuid(),
            QuizId = request.QuizId,
            StudentName = request.StudentName,
            RegistrationNumber = request.RegistrationNumber,
            StartedAt = DateTime.UtcNow,
            CurrentQuestionIndex = 0,
            MaxPossibleScore = quiz.Questions.Count,
        };
        _db.ExamAttempts.Add(attempt);
        await _db.SaveChangesAsync();

        var firstQuestion = quiz.Questions.OrderBy(q => q.OrderNo).First();
        return Ok(new ExamStartResult
        {
            AttemptId = attempt.Id,
            TotalQuestions = quiz.Questions.Count,
            TimeLimitPerQuestion = TimeLimitPerQuestionSeconds,
            Question = MapQuestion(firstQuestion, 0, quiz.Questions.Count)
        });
    }

    [HttpPost("{attemptId:guid}/answer")]
    public async Task<IActionResult> SubmitAnswer(Guid attemptId, [FromBody] SubmitExamAnswerRequest request)
    {
        var attempt = await _db.ExamAttempts
            .Include(a => a.Answers)
            .Include(a => a.Quiz).ThenInclude(q => q.Questions.OrderBy(o => o.OrderNo)).ThenInclude(q => q.Options)
            .FirstOrDefaultAsync(a => a.Id == attemptId);

        if (attempt == null) return NotFound("Sınav oturumu bulunamadı.");
        if (attempt.Status == "Finished") return BadRequest("Sınav zaten tamamlandı.");

        var questions = attempt.Quiz.Questions.ToList();
        if (request.QuestionIndex < 0 || request.QuestionIndex >= questions.Count)
            return BadRequest("Geçersiz soru indeksi.");

        var question = questions[request.QuestionIndex];

        var existing = attempt.Answers.FirstOrDefault(a => a.QuestionIndex == request.QuestionIndex);
        if (existing != null)
        {
            return Ok(new SubmitExamAnswerResult
            {
                IsCorrect = existing.IsCorrect,
                ScoreEarned = existing.ScoreEarned,
                CorrectOptionId = question.Options.First(o => o.IsCorrect).Id,
                NextQuestionIndex = request.QuestionIndex + 1 < questions.Count ? request.QuestionIndex + 1 : -1
            });
        }

        bool isCorrect = false;
        int score = 0;

        if (request.SelectedOptionId.HasValue)
        {
            var selectedOption = question.Options.FirstOrDefault(o => o.Id == request.SelectedOptionId.Value);
            isCorrect = selectedOption?.IsCorrect == true;

            if (isCorrect)
            {
                score = 1;
            }
        }

        var answer = new ExamAnswer
        {
            Id = Guid.NewGuid(),
            ExamAttemptId = attemptId,
            QuestionId = question.Id,
            SelectedOptionId = request.SelectedOptionId,
            TimeSpentMs = request.TimeSpentMs,
            ScoreEarned = score,
            IsCorrect = isCorrect,
            QuestionIndex = request.QuestionIndex
        };
        _db.ExamAnswers.Add(answer);
        attempt.TotalScore += score;

        int nextIndex = request.QuestionIndex + 1;
        if (nextIndex >= questions.Count)
        {
            attempt.FinishedAt = DateTime.UtcNow;
            attempt.Status = "Finished";
            double percentage = attempt.MaxPossibleScore > 0 ? (double)attempt.TotalScore / attempt.MaxPossibleScore * 100 : 0;
            attempt.IsPassed = percentage >= attempt.Quiz.PassScore;
            attempt.CurrentQuestionIndex = nextIndex;
        }
        else
        {
            attempt.CurrentQuestionIndex = nextIndex;
        }

        await _db.SaveChangesAsync();

        return Ok(new SubmitExamAnswerResult
        {
            IsCorrect = isCorrect,
            ScoreEarned = score,
            CorrectOptionId = question.Options.First(o => o.IsCorrect).Id,
            NextQuestionIndex = attempt.Status == "Finished" ? -1 : nextIndex
        });
    }

    [HttpGet("{attemptId:guid}/question")]
    public async Task<IActionResult> GetQuestion(Guid attemptId, [FromQuery] int index)
    {
        var attempt = await _db.ExamAttempts
            .Include(a => a.Quiz).ThenInclude(q => q.Questions.OrderBy(o => o.OrderNo)).ThenInclude(q => q.Options)
            .Include(a => a.Answers)
            .FirstOrDefaultAsync(a => a.Id == attemptId);

        if (attempt == null) return NotFound();
        if (attempt.Status == "Finished") return BadRequest("Sınav tamamlandı.");

        var questions = attempt.Quiz.Questions.ToList();
        if (index < 0 || index >= questions.Count) return BadRequest("Geçersiz soru indeksi.");

        var question = questions[index];
        var answered = attempt.Answers.FirstOrDefault(a => a.QuestionIndex == index);

        return Ok(new ExamQuestionResult
        {
            Question = MapQuestion(question, index, questions.Count),
            AlreadyAnswered = answered != null,
            SelectedOptionId = answered?.SelectedOptionId
        });
    }

    [HttpGet("{attemptId:guid}/result")]
    public async Task<IActionResult> GetResult(Guid attemptId)
    {
        var attempt = await _db.ExamAttempts
            .Include(a => a.Quiz)
            .Include(a => a.Answers).ThenInclude(a => a.Question)
            .FirstOrDefaultAsync(a => a.Id == attemptId);

        if (attempt == null) return NotFound();

        return Ok(new ExamResultDto
        {
            AttemptId = attempt.Id,
            QuizTitle = attempt.Quiz.Title,
            TotalScore = attempt.TotalScore,
            MaxPossibleScore = attempt.MaxPossibleScore,
            Percentage = attempt.MaxPossibleScore > 0 ? (double)attempt.TotalScore / attempt.MaxPossibleScore * 100 : 0,
            IsPassed = attempt.IsPassed,
            PassScore = attempt.Quiz.PassScore,
            TotalQuestions = attempt.Quiz.Questions.Count,
            CorrectCount = attempt.Answers.Count(a => a.IsCorrect),
            Status = attempt.Status,
            StartedAt = attempt.StartedAt,
            FinishedAt = attempt.FinishedAt
        });
    }

    [HttpGet("/api/admin/exam/{quizId:guid}/report")]
    public async Task<IActionResult> GetExamReport(Guid quizId)
    {
        var quiz = await _db.Quizzes
            .Include(q => q.Questions).ThenInclude(q => q.Options)
            .FirstOrDefaultAsync(q => q.Id == quizId);

        if (quiz == null) return NotFound();

        var attempts = await _db.ExamAttempts
            .Include(a => a.Answers).ThenInclude(a => a.Question)
            .Where(a => a.QuizId == quizId)
            .ToListAsync();

        var totalParticipants = attempts.Count;
        var passedCount = attempts.Count(a => a.IsPassed);
        var averageScore = attempts.Any() ? attempts.Average(a => a.MaxPossibleScore > 0 ? (double)a.TotalScore / a.MaxPossibleScore * 100 : 0) : 0;

        var questionStats = quiz.Questions.Select(q =>
        {
            var qAnswers = attempts.SelectMany(a => a.Answers).Where(a => a.QuestionId == q.Id).ToList();
            var wrongCount = qAnswers.Count(a => !a.IsCorrect);
            var totalCount = qAnswers.Count;
            return new QuestionStatDto
            {
                QuestionId = q.Id,
                QuestionText = q.Text,
                TotalAnswers = totalCount,
                WrongCount = wrongCount,
                WrongPercentage = totalCount > 0 ? (double)wrongCount / totalCount * 100 : 0
            };
        }).ToList();

        var leaderboard = attempts
            .GroupBy(a => new { a.StudentName, a.RegistrationNumber })
            .Select(g => new LeaderboardEntryDto
            {
                UserId = Guid.Empty,
                StudentName = g.Key.StudentName,
                RegistrationNumber = g.Key.RegistrationNumber,
                TotalScore = g.Max(a => a.TotalScore),
                MaxPossibleScore = g.First().MaxPossibleScore,
                Percentage = g.First().MaxPossibleScore > 0 ? (double)g.Max(a => a.TotalScore) / g.First().MaxPossibleScore * 100 : 0,
                IsPassed = g.Any(a => a.IsPassed),
                AttemptCount = g.Count(),
                BestAttemptId = g.OrderByDescending(a => a.TotalScore).First().Id
            })
            .OrderByDescending(e => e.TotalScore)
            .ToList();

        return Ok(new ExamReportDto
        {
            QuizId = quizId,
            QuizTitle = quiz.Title,
            TotalParticipants = totalParticipants,
            PassedCount = passedCount,
            FailedCount = totalParticipants - passedCount,
            AverageScore = averageScore,
            PassScore = quiz.PassScore,
            Leaderboard = leaderboard,
            QuestionStats = questionStats
        });
    }

    [HttpPost("toggle-status/{quizId:guid}")]
    public async Task<IActionResult> ToggleStatus(Guid quizId)
    {
        var quiz = await _db.Quizzes.FindAsync(quizId);
        if (quiz == null) return NotFound("Sınav bulunamadı.");

        quiz.IsActive = !quiz.IsActive;
        await _db.SaveChangesAsync();

        return Ok(new { quizId = quiz.Id, isActive = quiz.IsActive });
    }

    private static ExamQuestionDto MapQuestion(Question q, int index, int total)
    {
        return new ExamQuestionDto
        {
            QuestionId = q.Id,
            Text = q.Text,
            Index = index,
            TotalQuestions = total,
            TimeLimitInSeconds = TimeLimitPerQuestionSeconds,
            Points = 1,
            Options = q.Options.Select(o => new ExamOptionDto
            {
                OptionId = o.Id,
                Text = o.Text
            }).ToList()
        };
    }
}

public record StartExamRequest(string StudentName, string RegistrationNumber, Guid QuizId);

public class ExamStartResult
{
    public Guid AttemptId { get; set; }
    public int TotalQuestions { get; set; }
    public int TimeLimitPerQuestion { get; set; }
    public ExamQuestionDto Question { get; set; } = null!;
}

public record SubmitExamAnswerRequest(int QuestionIndex, Guid? SelectedOptionId, int TimeSpentMs);

public class SubmitExamAnswerResult
{
    public bool IsCorrect { get; set; }
    public int ScoreEarned { get; set; }
    public Guid CorrectOptionId { get; set; }
    public int NextQuestionIndex { get; set; }
}

public class ExamQuestionResult
{
    public ExamQuestionDto Question { get; set; } = null!;
    public bool AlreadyAnswered { get; set; }
    public Guid? SelectedOptionId { get; set; }
}

public class ExamQuestionDto
{
    public Guid QuestionId { get; set; }
    public string Text { get; set; } = string.Empty;
    public int Index { get; set; }
    public int TotalQuestions { get; set; }
    public int TimeLimitInSeconds { get; set; }
    public int Points { get; set; }
    public List<ExamOptionDto> Options { get; set; } = new();
}

public class ExamOptionDto
{
    public Guid OptionId { get; set; }
    public string Text { get; set; } = string.Empty;
}

public class ExamResultDto
{
    public Guid AttemptId { get; set; }
    public string QuizTitle { get; set; } = string.Empty;
    public int TotalScore { get; set; }
    public int MaxPossibleScore { get; set; }
    public double Percentage { get; set; }
    public bool IsPassed { get; set; }
    public int PassScore { get; set; }
    public int TotalQuestions { get; set; }
    public int CorrectCount { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
}

public class ExamReportDto
{
    public Guid QuizId { get; set; }
    public string QuizTitle { get; set; } = string.Empty;
    public int TotalParticipants { get; set; }
    public int PassedCount { get; set; }
    public int FailedCount { get; set; }
    public double AverageScore { get; set; }
    public int PassScore { get; set; }
    public List<LeaderboardEntryDto> Leaderboard { get; set; } = new();
    public List<QuestionStatDto> QuestionStats { get; set; } = new();
}

public class LeaderboardEntryDto
{
    public Guid UserId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string RegistrationNumber { get; set; } = string.Empty;
    public int TotalScore { get; set; }
    public int MaxPossibleScore { get; set; }
    public double Percentage { get; set; }
    public bool IsPassed { get; set; }
    public int AttemptCount { get; set; }
    public Guid BestAttemptId { get; set; }
}

public class QuestionStatDto
{
    public Guid QuestionId { get; set; }
    public string QuestionText { get; set; } = string.Empty;
    public int TotalAnswers { get; set; }
    public int WrongCount { get; set; }
    public double WrongPercentage { get; set; }
}
