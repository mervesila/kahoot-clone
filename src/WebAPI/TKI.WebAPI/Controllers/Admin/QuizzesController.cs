using MediatR;
using Microsoft.AspNetCore.Mvc;
using TKI.Application.Features.Quizzes.Commands;
using TKI.Application.Features.Quizzes.Commands.AddQuestionToQuiz;
using TKI.Application.Features.Quizzes.Commands.DeleteQuiz;
using TKI.Application.Features.Quizzes.Commands.RemoveQuestionFromQuiz;
using TKI.Application.Features.Quizzes.Commands.UpdateQuiz;
using TKI.Application.Features.Quizzes.Queries;

namespace TKI.WebAPI.Controllers.Admin;

public class QuizzesController : AdminBaseController
{
    private readonly IMediator _mediator;

    public QuizzesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var quizzes = await _mediator.Send(new GetAllQuizzesQuery());
        return Ok(quizzes);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var quiz = await _mediator.Send(new GetQuizByIdQuery(id));
        return Ok(quiz);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _mediator.Send(new DeleteQuizCommand(id));
        return NoContent();
    }

    [HttpDelete("{quizId:guid}/questions/{questionId:guid}")]
    public async Task<IActionResult> RemoveQuestion(Guid quizId, Guid questionId)
    {
        await _mediator.Send(new RemoveQuestionFromQuizCommand(quizId, questionId));
        return NoContent();
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateQuizCommand command)
    {
        var id = await _mediator.Send(command);
        return Created($"/api/admin/quizzes/{id}", new { id });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateQuizCommand command)
    {
        await _mediator.Send(command with { Id = id });
        return NoContent();
    }

    [HttpPost("{quizId:guid}/questions/{questionId:guid}")]
    public async Task<IActionResult> AddQuestion(
        Guid quizId,
        Guid questionId,
        [FromBody] AddQuestionToQuizCommand? command)
    {
        var payload = (command ?? new AddQuestionToQuizCommand(quizId, questionId))
            with { QuizId = quizId, QuestionId = questionId };

        await _mediator.Send(payload);
        return NoContent();
    }
}
