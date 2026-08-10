using MediatR;
using TKI.Application.Features.GameSessions.Queries.GetSessionParticipants;

namespace TKI.Application.Features.GameSessions.Queries.GetSessionParticipants;

public record GetSessionParticipantsQuery(Guid GameSessionId)
    : IRequest<List<SessionParticipantDto>>;
