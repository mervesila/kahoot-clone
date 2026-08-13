using MediatR;

namespace TKI.Application.Features.Categories.Commands.CreateCategory;

public record CreateCategoryCommand(
    string Name,
    string? Description = null) : IRequest<int>;
