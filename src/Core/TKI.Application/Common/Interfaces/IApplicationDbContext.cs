using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace TKI.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DatabaseFacade Database { get; }
    DbSet<User> Users { get; }
    DbSet<Category> Categories { get; }
    DbSet<Question> Questions { get; }
    DbSet<Option> Options { get; }
    DbSet<Quiz> Quizzes { get; }
    DbSet<GameSession> GameSessions { get; }
    DbSet<ParticipantAnswer> ParticipantAnswers { get; }
    DbSet<JokerUsage> JokerUsages { get; }
    DbSet<SessionParticipant> SessionParticipants { get; }
    DbSet<UserQuizResult> UserQuizResults { get; }
    DbSet<GameSessionQuestion> GameSessionQuestions { get; }
    DbSet<ExamAttempt> ExamAttempts { get; }
    DbSet<ExamAnswer> ExamAnswers { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
