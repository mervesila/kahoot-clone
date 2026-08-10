using MediatR;
using Microsoft.AspNetCore.Mvc;
using TKI.Application.Features.Quizzes.Commands.ImportQuestionPool;
using TKI.Application.Exceptions;
using TKI.WebAPI.Services;

namespace TKI.WebAPI.Controllers.Admin;

[Route("api/admin/question-pool")]
public class QuestionPoolController : AdminBaseController
{
    private readonly IMediator _mediator;
    private readonly QuestionPoolService _questionPoolService;

    public QuestionPoolController(IMediator mediator, QuestionPoolService questionPoolService)
    {
        _mediator = mediator;
        _questionPoolService = questionPoolService;
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        return Ok(_questionPoolService.GetPool());
    }

    [HttpPost("import")]
    public async Task<IActionResult> Import([FromBody] ImportQuestionPoolRequest request)
    {
        var category = _questionPoolService.FindCategory(request.CategoryName)
            ?? throw new NotFoundException(nameof(QuestionPoolCategoryDto), request.CategoryName);

        var count = request.QuestionCount is > 0 ? request.QuestionCount.Value : category.Questions.Count;

        var questions = category.Questions
            .OrderBy(_ => Random.Shared.Next())
            .Take(count)
            .Select(q => new PoolQuestionItem(q.Text, q.Options, q.CorrectIndex))
            .ToList();

        var id = await _mediator.Send(new ImportQuestionPoolCommand(
            request.Title,
            request.Description ?? string.Empty,
            category.Name,
            questions));

        return Created($"/api/admin/quizzes/{id}", new { id });
    }
}

public class ImportQuestionPoolRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int? QuestionCount { get; set; }
}
