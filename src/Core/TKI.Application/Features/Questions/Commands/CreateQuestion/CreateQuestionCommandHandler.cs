using Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common.Interfaces;
using TKI.Application.Exceptions;

namespace TKI.Application.Features.Questions.Commands.CreateQuestion;

public class CreateQuestionCommandHandler : IRequestHandler<CreateQuestionCommand, Guid>
{
    private readonly IApplicationDbContext _db;

    public CreateQuestionCommandHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<Guid> Handle(
        CreateQuestionCommand request,
        CancellationToken cancellationToken)
    {
        if (request.QuizId is not null
            && !await _db.Quizzes.AnyAsync(q => q.Id == request.QuizId, cancellationToken))
        {
            throw new NotFoundException(nameof(Quiz), request.QuizId.Value);
        }

        var orderNo = 0;
        if (request.QuizId is not null)
        {
            orderNo = await _db.Questions
                .Where(q => q.QuizId == request.QuizId)
                .Select(q => (int?)q.OrderNo)
                .MaxAsync(cancellationToken) ?? 0;
            orderNo++;
        }

        var question = new Question
        {
            CategoryId = request.CategoryId,
            QuizId = request.QuizId,
            OrderNo = orderNo,
            Text = request.Text,
            MediaUrl = request.MediaUrl,
            TargetRole = request.TargetRole,
            TimeLimitInSeconds = request.TimeLimitInSeconds,
            Points = request.Points,
            Options = request.Options
                .Select(o => new Option
                {
                    Text = o.Text,
                    IsCorrect = o.IsCorrect
                })
                .ToList()
        };

        _db.Questions.Add(question);
        await _db.SaveChangesAsync(cancellationToken);

        return question.Id;
    }
}
