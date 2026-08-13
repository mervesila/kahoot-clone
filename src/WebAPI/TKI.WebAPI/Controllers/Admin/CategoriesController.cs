using MediatR;
using Microsoft.AspNetCore.Mvc;
using TKI.Application.Features.Categories.Commands.CreateCategory;
using TKI.Application.Features.Categories.Queries;

namespace TKI.WebAPI.Controllers.Admin;

public class CategoriesController : AdminBaseController
{
    private readonly IMediator _mediator;

    public CategoriesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _mediator.Send(new GetCategoriesQuery());
        return Ok(categories);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCategoryCommand command)
    {
        var id = await _mediator.Send(command);
        return Created($"/api/admin/categories/{id}", new { id });
    }
}
