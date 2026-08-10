using MediatR;
using TKI.Application.Features.Auth;

namespace TKI.Application.Features.Auth.Commands.RegisterAdmin;

public record RegisterAdminCommand(
    string RegistrationNumber,
    string Password,
    string FirstName,
    string LastName,
    string Department) : IRequest<AuthResult>;
