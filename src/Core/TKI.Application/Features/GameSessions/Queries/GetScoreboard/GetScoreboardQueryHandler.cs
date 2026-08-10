using Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common.Interfaces;
using TKI.Application.Exceptions;
using TKI.Application.Features.GameSessions.Queries.GetScoreboard;

namespace TKI.Application.Features.GameSessions.Queries.GetScoreboard;

public class GetScoreboardQueryHandler : IRequestHandler<GetScoreboardQuery, ScoreboardDto>
{
    private readonly IApplicationDbContext _db;

    public GetScoreboardQueryHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<ScoreboardDto> Handle(
        GetScoreboardQuery request,
        CancellationToken cancellationToken)
    {
        var session = await _db.GameSessions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == request.GameSessionId, cancellationToken)
            ?? throw new NotFoundException(nameof(GameSession), request.GameSessionId);

        var quizTitle = await _db.Quizzes
            .Where(q => q.Id == session.QuizId)
            .Select(q => q.Title)
            .FirstOrDefaultAsync(cancellationToken) ?? string.Empty;

        var answers = await _db.ParticipantAnswers
            .AsNoTracking()
            .Where(pa => pa.GameSessionId == request.GameSessionId)
            .Include(pa => pa.User)
            .ToListAsync(cancellationToken);

        var correctOptionIds = await _db.Options
            .AsNoTracking()
            .Where(o => o.IsCorrect)
            .ToDictionaryAsync(o => o.QuestionId, o => o.Id, cancellationToken);

        var players = new Dictionary<Guid, ScoreboardPlayerDto>();

        foreach (var answer in answers)
        {
            if (!players.TryGetValue(answer.UserId, out var player))
            {
                player = new ScoreboardPlayerDto
                {
                    PlayerId = answer.UserId,
                    PlayerName = $"{answer.User.FirstName} {answer.User.LastName}".Trim(),
                    TeamName = answer.User.TeamName
                };
                players[answer.UserId] = player;
            }

            player.Score += answer.ScoreEarned;
            player.TotalAnswers++;

            if (correctOptionIds.TryGetValue(answer.QuestionId, out var correctId)
                && answer.SelectedOptionId == correctId)
            {
                player.CorrectCount++;
            }
        }

        var individual = players.Values
            .OrderByDescending(p => p.Score)
            .ToList();

        var teams = new List<ScoreboardTeamDto>();

        if (session.IsTeamMode)
        {
            teams = individual
                .Where(p => !string.IsNullOrWhiteSpace(p.TeamName))
                .GroupBy(p => p.TeamName!)
                .Select(g => new ScoreboardTeamDto
                {
                    TeamName = g.Key,
                    TotalScore = g.Sum(p => p.Score),
                    PlayerCount = g.Count(),
                    AverageScore = Math.Round(g.Average(p => p.Score), 2)
                })
                .OrderByDescending(t => t.AverageScore)
                .ToList();
        }

        return new ScoreboardDto
        {
            SessionId = session.Id,
            QuizTitle = quizTitle,
            IsTeamMode = session.IsTeamMode,
            Individual = individual,
            Teams = teams
        };
    }
}
