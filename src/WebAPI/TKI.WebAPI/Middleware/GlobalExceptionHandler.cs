using Microsoft.AspNetCore.Diagnostics;
using TKI.Application.Exceptions;

namespace TKI.WebAPI.Middleware;

public class GlobalExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var (statusCode, message, errors) = exception switch
        {
            ValidationException validationException => (
                StatusCodes.Status400BadRequest,
                validationException.Message,
                validationException.Errors),
            NotFoundException notFoundException => (
                StatusCodes.Status404NotFound,
                notFoundException.Message,
                null),
            BusinessRuleException businessRuleException => (
                StatusCodes.Status400BadRequest,
                businessRuleException.Message,
                null),
            NicknameConflictException nicknameConflictException => (
                StatusCodes.Status409Conflict,
                nicknameConflictException.Message,
                null),
            AuthenticationException authenticationException => (
                StatusCodes.Status401Unauthorized,
                authenticationException.Message,
                null),
            _ => (
                StatusCodes.Status500InternalServerError,
                "Sunucuda beklenmeyen bir hata oluştu.",
                null)
        };

        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(new { message, errors }, cancellationToken);

        return true;
    }
}
