using Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common.Interfaces;
using TKI.Application.Exceptions;
using TKI.Application.Features.GameSessions.Queries.GetSessionParticipants;

namespace TKI.Application.Features.GameSessions.Queries.GetSessionParticipants;

public class GetSessionParticipantsQueryHandler
    : IRequestHandler<GetSessionParticipantsQuery, List<SessionParticipantDto>>
{
    private readonly IApplicationDbContext _db;

    public GetSessionParticipantsQueryHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<List<SessionParticipantDto>> Handle(
        GetSessionParticipantsQuery request,
        CancellationToken cancellationToken)
    {
        var session = await _db.GameSessions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == request.GameSessionId, cancellationToken)
            ?? throw new NotFoundException(nameof(GameSession), request.GameSessionId);

        return await _db.SessionParticipants
            .AsNoTracking()
            .Where(sp => sp.GameSessionId == request.GameSessionId)
            .OrderBy(sp => sp.JoinedAt)
            .Select(sp => new SessionParticipantDto
            {
                PlayerId = sp.UserId,
                PlayerName = (sp.User.FirstName + " " + sp.User.LastName).Trim(),
                TeamName = sp.User.TeamName,
                AvatarEmoji = sp.User.AvatarEmoji,
                AvatarColor = sp.User.AvatarColor
            })
            .ToListAsync(cancellationToken);
    }
}
