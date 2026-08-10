using MediatR;
using TKI.Application.Features.Auth;

namespace TKI.Application.Features.Auth.Commands.Login;

public record LoginCommand(
    string RegistrationNumber,
    string Password) : IRequest<AuthResult>;
