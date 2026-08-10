using Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common;
using TKI.Application.Common.Interfaces;
using TKI.Application.Exceptions;
using TKI.Application.Features.GameSessions.DTOs;

namespace TKI.Application.Features.GameSessions.Commands.CreateGameSession;

public class CreateGameSessionCommandHandler : IRequestHandler<CreateGameSessionCommand, GameSessionDto>
{
    private const int PinAttemptLimit = 20;
    private const int QuestionsPerSession = 10;

    private readonly IApplicationDbContext _db;

    public CreateGameSessionCommandHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<GameSessionDto> Handle(
        CreateGameSessionCommand request,
        CancellationToken cancellationToken)
    {
        var quiz = await _db.Quizzes
            .FirstOrDefaultAsync(q => q.Id == request.QuizId, cancellationToken)
            ?? throw new NotFoundException(nameof(Quiz), request.QuizId);

        if (!quiz.IsActive)
        {
            throw new BusinessRuleException("Pasif durumdaki quizler oyuna başlatılamaz.");
        }

        var pinCode = await GenerateUniquePinAsync(cancellationToken);

        var session = new GameSession
        {
            QuizId = request.QuizId,
            PinCode = pinCode,
            Status = GameSessionStatuses.Waiting,
            IsTeamMode = request.IsTeamMode
        };

        _db.GameSessions.Add(session);
        await _db.SaveChangesAsync(cancellationToken);

        await AssignQuestionsAsync(session, quiz.Level, cancellationToken);

        return new GameSessionDto
        {
            Id = session.Id,
            QuizId = session.QuizId,
            PinCode = session.PinCode,
            Status = session.Status
        };
    }

    private async Task AssignQuestionsAsync(
        GameSession session,
        int quizLevel,
        CancellationToken cancellationToken)
    {
        var poolQuery = _db.Questions
            .Where(q => q.QuizId == null);

        if (quizLevel == 2)
        {
            var excludeIds = await GetLastLevelOneQuestionIdsAsync(cancellationToken);
            if (excludeIds.Count > 0)
            {
                poolQuery = poolQuery.Where(q => !excludeIds.Contains(q.Id));
            }
        }

        var questionIds = await poolQuery
            .Select(q => q.Id)
            .ToListAsync(cancellationToken);

        var selected = questionIds
            .OrderBy(_ => Random.Shared.Next())
            .Take(QuestionsPerSession)
            .ToList();

        var orderNo = 1;
        foreach (var questionId in selected)
        {
            _db.GameSessionQuestions.Add(new GameSessionQuestion
            {
                GameSessionId = session.Id,
                QuestionId = questionId,
                OrderNo = orderNo++
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<List<Guid>> GetLastLevelOneQuestionIdsAsync(CancellationToken cancellationToken)
    {
        var lastLevelOneSession = await _db.GameSessions
            .AsNoTracking()
            .Where(gs => gs.Status == GameSessionStatuses.Finished && gs.Quiz.Level == 1)
            .OrderByDescending(gs => gs.FinishedAt)
            .Select(gs => gs.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (lastLevelOneSession == Guid.Empty)
        {
            return new List<Guid>();
        }

        return await _db.GameSessionQuestions
            .AsNoTracking()
            .Where(gsq => gsq.GameSessionId == lastLevelOneSession)
            .Select(gsq => gsq.QuestionId)
            .ToListAsync(cancellationToken);
    }

    private async Task<string> GenerateUniquePinAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < PinAttemptLimit; attempt++)
        {
            var pinCode = Random.Shared.Next(100000, 1000000).ToString();

            var inUse = await _db.GameSessions.AnyAsync(
                gs => gs.PinCode == pinCode && gs.Status != GameSessionStatuses.Finished,
                cancellationToken);

            if (!inUse)
            {
                return pinCode;
            }
        }

        throw new InvalidOperationException("Benzersiz bir PIN kodu üretilemedi.");
    }
}
