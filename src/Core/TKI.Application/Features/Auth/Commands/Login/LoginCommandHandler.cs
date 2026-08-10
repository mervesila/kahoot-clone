using Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common.Interfaces;
using TKI.Application.Exceptions;
using TKI.Application.Features.Auth;

namespace TKI.Application.Features.Auth.Commands.Login;

public class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResult>
{
    private readonly IApplicationDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;

    public LoginCommandHandler(
        IApplicationDbContext db,
        IPasswordHasher passwordHasher,
        ITokenService tokenService)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
    }

    public async Task<AuthResult> Handle(
        LoginCommand request,
        CancellationToken cancellationToken)
    {
        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(
                u => u.RegistrationNumber == request.RegistrationNumber
                     && u.Role == "Admin",
                cancellationToken);

        if (user is null || user.PasswordHash is null
            || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            throw new AuthenticationException("Sicil numarası veya parola hatalı.");
        }

        var token = _tokenService.CreateToken(user.Id, user.RegistrationNumber, user.Role);

        return new AuthResult
        {
            UserId = user.Id,
            RegistrationNumber = user.RegistrationNumber,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Department = user.Department,
            Role = user.Role,
            Token = token.Token,
            ExpiresAt = token.ExpiresAt
        };
    }
}
