using FluentValidation;
using TKI.Application.Features.GameSessions.Commands.CreateGameSession;

namespace TKI.Application.Features.GameSessions.Commands.CreateGameSession;

public class CreateGameSessionCommandValidator : AbstractValidator<CreateGameSessionCommand>
{
    public CreateGameSessionCommandValidator()
    {
        RuleFor(x => x.QuizId)
            .NotEmpty().WithMessage("Quiz seçilmelidir.");
    }
}
