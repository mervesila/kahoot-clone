using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace TKI.Application.Common.Interfaces;

public interface IApplicationDbContext
{
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

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
