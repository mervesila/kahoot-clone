using Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common.Interfaces;
using TKI.Application.Exceptions;

namespace TKI.Application.Features.Quizzes.Commands.DeleteQuiz;

public class DeleteQuizCommandHandler : IRequestHandler<DeleteQuizCommand>
{
    private readonly IApplicationDbContext _db;

    public DeleteQuizCommandHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task Handle(DeleteQuizCommand request, CancellationToken cancellationToken)
    {
        if (!await _db.Quizzes.AnyAsync(q => q.Id == request.QuizId, cancellationToken))
        {
            throw new NotFoundException(nameof(Quiz), request.QuizId);
        }

        await _db.GameSessions
            .Where(gs => gs.QuizId == request.QuizId)
            .ExecuteDeleteAsync(cancellationToken);

        await _db.Quizzes
            .Where(q => q.Id == request.QuizId)
            .ExecuteDeleteAsync(cancellationToken);
    }
}
