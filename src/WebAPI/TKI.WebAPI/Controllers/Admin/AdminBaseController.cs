using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace TKI.WebAPI.Controllers.Admin;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin/[controller]")]
public abstract class AdminBaseController : ControllerBase
{
}
