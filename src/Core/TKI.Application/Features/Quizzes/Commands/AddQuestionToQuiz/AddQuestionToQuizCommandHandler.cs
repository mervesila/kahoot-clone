using Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common.Interfaces;
using TKI.Application.Exceptions;

namespace TKI.Application.Features.Quizzes.Commands.AddQuestionToQuiz;

public class AddQuestionToQuizCommandHandler : IRequestHandler<AddQuestionToQuizCommand>
{
    private readonly IApplicationDbContext _db;

    public AddQuestionToQuizCommandHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task Handle(
        AddQuestionToQuizCommand request,
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
            return;
        }

        if (question.QuizId is not null)
        {
            throw new BusinessRuleException(
                "Bu soru başka bir sınava zaten eklenmiş. Bir soru aynı anda yalnızca bir sınava ait olabilir.");
        }

        var maxOrderNo = await _db.Questions
            .Where(q => q.QuizId == request.QuizId)
            .Select(q => (int?)q.OrderNo)
            .MaxAsync(cancellationToken) ?? 0;

        question.QuizId = request.QuizId;
        question.OrderNo = request.OrderNo > 0 ? request.OrderNo : maxOrderNo + 1;

        await _db.SaveChangesAsync(cancellationToken);
    }
}
