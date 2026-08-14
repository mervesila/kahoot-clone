using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common.Interfaces;

namespace TKI.Application.Features.GameSessions.Commands;

public static class QuestionStartedEventBuilder
{
    public static async Task<QuestionStartedEvent> BuildAsync(
        IApplicationDbContext db,
        GameSession session,
        CancellationToken cancellationToken)
    {
        var totalQuestions = await db.GameSessionQuestions.CountAsync(
            gsq => gsq.GameSessionId == session.Id,
            cancellationToken);

        var question = await db.GameSessionQuestions
            .AsNoTracking()
            .Include(gsq => gsq.Question)
                .ThenInclude(q => q.Options)
            .Where(gsq => gsq.GameSessionId == session.Id
                && gsq.OrderNo == session.CurrentQuestionOrderNo)
            .Select(gsq => gsq.Question)
            .FirstOrDefaultAsync(cancellationToken);

        var jokersEnabled = await db.Quizzes
            .AsNoTracking()
            .Where(q => q.Id == session.QuizId)
            .Select(q => q.JokersEnabled)
            .FirstOrDefaultAsync(cancellationToken);

        var options = (question?.Options ?? Enumerable.Empty<Option>())
            .OrderBy(o => o.Id)
            .Select(o => new QuestionStartedOption(o.Id.ToString(), o.Text))
            .ToList();

        return new QuestionStartedEvent(
            session.Id,
            session.CurrentQuestionOrderNo,
            totalQuestions,
            question?.TimeLimitInSeconds ?? 30,
            question?.Points ?? 0,
            question?.Id ?? Guid.Empty,
            question?.Text ?? string.Empty,
            options,
            jokersEnabled);
    }
}
