using Domain.Common;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common.Interfaces;

namespace TKI.Persistence;

public class AppDbContext : DbContext, IApplicationDbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<Option> Options => Set<Option>();
    public DbSet<Quiz> Quizzes => Set<Quiz>();
    public DbSet<GameSession> GameSessions => Set<GameSession>();
    public DbSet<ParticipantAnswer> ParticipantAnswers => Set<ParticipantAnswer>();
    public DbSet<JokerUsage> JokerUsages => Set<JokerUsage>();
    public DbSet<SessionParticipant> SessionParticipants => Set<SessionParticipant>();
    public DbSet<UserQuizResult> UserQuizResults => Set<UserQuizResult>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Question>()
            .HasOne(q => q.Category)
            .WithMany(c => c.Questions)
            .HasForeignKey(q => q.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Question>()
            .HasOne(q => q.Quiz)
            .WithMany(z => z.Questions)
            .HasForeignKey(q => q.QuizId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Quiz>()
            .HasOne(q => q.Category)
            .WithMany()
            .HasForeignKey(q => q.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Option>()
            .HasOne(o => o.Question)
            .WithMany(q => q.Options)
            .HasForeignKey(o => o.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<GameSession>()
            .HasOne(gs => gs.Quiz)
            .WithMany(q => q.GameSessions)
            .HasForeignKey(gs => gs.QuizId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ParticipantAnswer>(entity =>
        {
            entity.HasOne(pa => pa.GameSession)
                .WithMany(gs => gs.ParticipantAnswers)
                .HasForeignKey(pa => pa.GameSessionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(pa => pa.User)
                .WithMany(u => u.Answers)
                .HasForeignKey(pa => pa.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(pa => pa.Question)
                .WithMany()
                .HasForeignKey(pa => pa.QuestionId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(pa => pa.SelectedOption)
                .WithMany()
                .HasForeignKey(pa => pa.SelectedOptionId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<User>()
            .HasIndex(u => u.RegistrationNumber)
            .IsUnique();

        modelBuilder.Entity<GameSession>()
            .HasIndex(gs => gs.PinCode);

        modelBuilder.Entity<JokerUsage>(entity =>
        {
            entity.HasOne(j => j.GameSession)
                .WithMany(gs => gs.JokerUsages)
                .HasForeignKey(j => j.GameSessionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(j => j.User)
                .WithMany()
                .HasForeignKey(j => j.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(j => j.Question)
                .WithMany()
                .HasForeignKey(j => j.QuestionId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(j => new { j.GameSessionId, j.UserId, j.QuestionId, j.JokerType });
        });

        modelBuilder.Entity<SessionParticipant>(entity =>
        {
            entity.HasOne(sp => sp.GameSession)
                .WithMany(gs => gs.SessionParticipants)
                .HasForeignKey(sp => sp.GameSessionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(sp => sp.User)
                .WithMany(u => u.SessionParticipants)
                .HasForeignKey(sp => sp.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(sp => new { sp.GameSessionId, sp.UserId })
                .IsUnique();
        });

        modelBuilder.Entity<UserQuizResult>(entity =>
        {
            entity.HasOne(ur => ur.User)
                .WithMany()
                .HasForeignKey(ur => ur.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(ur => ur.Quiz)
                .WithMany(q => q.UserQuizResults)
                .HasForeignKey(ur => ur.QuizId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(ur => new { ur.UserId, ur.QuizId })
                .IsUnique();
        });
    }
}
