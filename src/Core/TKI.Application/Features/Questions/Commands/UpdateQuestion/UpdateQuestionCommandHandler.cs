using Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TKI.Application.Common.Interfaces;
using TKI.Application.Exceptions;

namespace TKI.Application.Features.Questions.Commands.UpdateQuestion;

public class UpdateQuestionCommandHandler : IRequestHandler<UpdateQuestionCommand>
{
    private readonly IApplicationDbContext _db;

    public UpdateQuestionCommandHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task Handle(
        UpdateQuestionCommand request,
        CancellationToken cancellationToken)
    {
        var question = await _db.Questions
            .Include(q => q.Options)
            .FirstOrDefaultAsync(q => q.Id == request.Id, cancellationToken);

        if (question is null)
        {
            throw new NotFoundException(nameof(Question), request.Id);
        }

        question.CategoryId = request.CategoryId;
        question.Text = request.Text;
        question.MediaUrl = request.MediaUrl;
        question.TargetRole = request.TargetRole;
        question.TimeLimitInSeconds = request.TimeLimitInSeconds;
        question.Points = request.Points;

        var existingOptions = question.Options.ToList();

        for (var i = 0; i < request.Options.Count; i++)
        {
            var newOption = request.Options[i];
            if (i < existingOptions.Count)
            {
                existingOptions[i].Text = newOption.Text;
                existingOptions[i].IsCorrect = newOption.IsCorrect;
            }
            else
            {
                question.Options.Add(new Option
                {
                    Text = newOption.Text,
                    IsCorrect = newOption.IsCorrect
                });
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
    }
}
