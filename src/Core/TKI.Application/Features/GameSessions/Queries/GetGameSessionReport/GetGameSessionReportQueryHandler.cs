using Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common.Interfaces;
using TKI.Application.Exceptions;
using TKI.Application.Features.GameSessions.Queries.GetGameSessionReport;

namespace TKI.Application.Features.GameSessions.Queries.GetGameSessionReport;

public class GetGameSessionReportQueryHandler : IRequestHandler<GetGameSessionReportQuery, GameSessionReportDto>
{
    private readonly IApplicationDbContext _db;

    public GetGameSessionReportQueryHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<GameSessionReportDto> Handle(
        GetGameSessionReportQuery request,
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

        var questions = await _db.Questions
            .AsNoTracking()
            .Where(q => q.QuizId == session.QuizId)
            .OrderBy(q => q.OrderNo)
            .Include(q => q.Options)
            .ToListAsync(cancellationToken);

        var answers = await _db.ParticipantAnswers
            .AsNoTracking()
            .Where(pa => pa.GameSessionId == request.GameSessionId)
            .Include(pa => pa.User)
            .ToListAsync(cancellationToken);

        var reportQuestions = questions.Select(question =>
        {
            var questionAnswers = answers.Where(a => a.QuestionId == question.Id).ToList();
            var correctOptionId = question.Options.FirstOrDefault(o => o.IsCorrect)?.Id;

            return new ReportQuestionDto
            {
                QuestionId = question.Id,
                Text = question.Text,
                OrderNo = question.OrderNo,
                TotalAnswers = questionAnswers.Count,
                CorrectCount = correctOptionId is null
                    ? 0
                    : questionAnswers.Count(a => a.SelectedOptionId == correctOptionId),
                Options = question.Options.Select(o => new ReportOptionDto
                {
                    OptionId = o.Id,
                    Text = o.Text,
                    IsCorrect = o.IsCorrect,
                    PickCount = questionAnswers.Count(a => a.SelectedOptionId == o.Id)
                }).ToList()
            };
        }).ToList();

        var players = answers
            .GroupBy(a => a.UserId)
            .Select(g =>
            {
                var user = g.First().User;
                var correctCount = g.Count(a =>
                {
                    var q = questions.FirstOrDefault(x => x.Id == a.QuestionId);
                    var correctId = q?.Options.FirstOrDefault(o => o.IsCorrect)?.Id;
                    return correctId is not null && a.SelectedOptionId == correctId;
                });

                return new ReportPlayerDto
                {
                    PlayerId = g.Key,
                    PlayerName = $"{user.FirstName} {user.LastName}",
                    TeamName = user.TeamName,
                    Score = g.Sum(a => a.ScoreEarned),
                    CorrectCount = correctCount,
                    TotalAnswers = g.Count(),
                    Accuracy = g.Count() == 0 ? 0 : Math.Round((double)correctCount / g.Count() * 100, 1)
                };
            })
            .OrderByDescending(p => p.Score)
            .ToList();

        var teams = new List<ReportTeamDto>();

        if (session.IsTeamMode)
        {
            teams = players
                .Where(p => !string.IsNullOrWhiteSpace(p.TeamName))
                .GroupBy(p => p.TeamName!)
                .Select(g => new ReportTeamDto
                {
                    TeamName = g.Key,
                    TotalScore = g.Sum(p => p.Score),
                    PlayerCount = g.Count(),
                    AverageScore = Math.Round(g.Average(p => p.Score), 2)
                })
                .OrderByDescending(t => t.AverageScore)
                .ToList();
        }

        return new GameSessionReportDto
        {
            SessionId = session.Id,
            QuizId = session.QuizId,
            QuizTitle = quizTitle,
            Status = session.Status,
            IsTeamMode = session.IsTeamMode,
            StartedAt = session.StartedAt,
            FinishedAt = session.FinishedAt,
            Questions = reportQuestions,
            Players = players,
            Teams = teams
        };
    }
}
