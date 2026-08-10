using Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common.Interfaces;
using TKI.Application.Exceptions;
using TKI.Application.Features.Auth;

namespace TKI.Application.Features.Auth.Commands.RegisterAdmin;

public class RegisterAdminCommandHandler : IRequestHandler<RegisterAdminCommand, AuthResult>
{
    private const string AdminRole = "Admin";

    private readonly IApplicationDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;

    public RegisterAdminCommandHandler(
        IApplicationDbContext db,
        IPasswordHasher passwordHasher,
        ITokenService tokenService)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
    }

    public async Task<AuthResult> Handle(
        RegisterAdminCommand request,
        CancellationToken cancellationToken)
    {
        var exists = await _db.Users.AnyAsync(
            u => u.RegistrationNumber == request.RegistrationNumber,
            cancellationToken);

        if (exists)
        {
            throw new BusinessRuleException("Bu sicil numarası zaten kayıtlı.");
        }

        var user = new User
        {
            RegistrationNumber = request.RegistrationNumber,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Department = request.Department,
            Role = AdminRole,
            PasswordHash = _passwordHasher.Hash(request.Password)
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(cancellationToken);

        return BuildResult(user);
    }

    private AuthResult BuildResult(User user)
    {
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
