using Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common.Interfaces;
using TKI.Application.Exceptions;

namespace TKI.Application.Features.Quizzes.Commands.RemoveQuestionFromQuiz;

public class RemoveQuestionFromQuizCommandHandler : IRequestHandler<RemoveQuestionFromQuizCommand>
{
    private readonly IApplicationDbContext _db;

    public RemoveQuestionFromQuizCommandHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task Handle(
        RemoveQuestionFromQuizCommand request,
        CancellationToken cancellationToken)
    {
        if (!await _db.Quizzes.AnyAsync(q => q.Id == request.QuizId, cancellationToken))
        {
            throw new NotFoundException(nameof(Quiz), request.QuizId);
        }

        var question = await _db.Questions
            .FirstOrDefaultAsync(q => q.Id == request.QuestionId, cancellationToken)
            ?? throw new NotFoundException(nameof(Question), request.QuestionId);

        if (question.QuizId == request.QuizId)
        {
            question.QuizId = null;
            question.OrderNo = 0;
            await _db.SaveChangesAsync(cancellationToken);
        }
    }
}
