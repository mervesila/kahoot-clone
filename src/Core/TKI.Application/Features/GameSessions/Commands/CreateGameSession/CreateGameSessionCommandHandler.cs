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

        return new GameSessionDto
        {
            Id = session.Id,
            QuizId = session.QuizId,
            PinCode = session.PinCode,
            Status = session.Status
        };
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
