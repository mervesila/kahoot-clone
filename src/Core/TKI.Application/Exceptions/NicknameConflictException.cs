namespace TKI.Application.Exceptions;

public class NicknameConflictException : Exception
{
    public NicknameConflictException(string message)
        : base(message)
    {
    }
}
