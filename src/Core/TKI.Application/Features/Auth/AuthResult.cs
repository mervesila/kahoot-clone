namespace TKI.Application.Features.Auth;

public class AuthResult
{
    public Guid UserId { get; set; }
    public string RegistrationNumber { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Role { get; set; } = "Admin";
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}
