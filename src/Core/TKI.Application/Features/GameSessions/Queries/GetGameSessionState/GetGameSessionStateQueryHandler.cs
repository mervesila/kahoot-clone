using Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common.Interfaces;
using TKI.Application.Exceptions;
using TKI.Application.Features.GameSessions.Commands;

namespace TKI.Application.Features.GameSessions.Queries.GetGameSessionState;

public class GetGameSessionStateQueryHandler : IRequestHandler<GetGameSessionStateQuery, GameSessionStateDto>
{
    private readonly IApplicationDbContext _db;

    public GetGameSessionStateQueryHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<GameSessionStateDto> Handle(
        GetGameSessionStateQuery request,
        CancellationToken cancellationToken)
    {
        var session = await _db.GameSessions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == request.GameSessionId, cancellationToken)
            ?? throw new NotFoundException(nameof(GameSession), request.GameSessionId);

        return new GameSessionStateDto
        {
            Id = session.Id,
            Status = session.Status,
            CurrentQuestionOrderNo = session.CurrentQuestionOrderNo,
            StartedAt = session.StartedAt,
            FinishedAt = session.FinishedAt
        };
    }
}
