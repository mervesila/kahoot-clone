namespace TKI.Application.Common.Interfaces;

public record TokenResult(string Token, DateTime ExpiresAt);

public interface ITokenService
{
    TokenResult CreateToken(Guid userId, string registrationNumber, string role);
}
