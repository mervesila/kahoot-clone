using MediatR;
using Microsoft.AspNetCore.Mvc;
using TKI.Application.Features.Questions.Commands.CreateQuestion;
using TKI.Application.Features.Questions.Commands.UpdateQuestion;

namespace TKI.WebAPI.Controllers.Admin;

public class QuestionsController : AdminBaseController
{
    private readonly IMediator _mediator;

    public QuestionsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateQuestionCommand command)
    {
        var id = await _mediator.Send(command);
        return Created($"/api/admin/questions/{id}", new { id });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateQuestionCommand command)
    {
        await _mediator.Send(command with { Id = id });
        return NoContent();
    }
}
