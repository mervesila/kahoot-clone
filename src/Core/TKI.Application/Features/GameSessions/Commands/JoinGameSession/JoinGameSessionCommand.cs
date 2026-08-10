using MediatR;
using TKI.Application.Features.GameSessions.DTOs;

namespace TKI.Application.Features.GameSessions.Commands.JoinGameSession;

public record JoinGameSessionCommand(
    string PinCode,
    string RegistrationNumber,
    string FirstName,
    string LastName,
    string Department,
    string? TeamName = null,
    string? AvatarEmoji = null,
    string? AvatarColor = null) : IRequest<JoinGameSessionResult>;
