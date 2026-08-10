using Microsoft.AspNetCore.Mvc;

namespace TKI.WebAPI.Controllers.Player;

[ApiController]
[Route("api/player/[controller]")]
public abstract class PlayerBaseController : ControllerBase
{
}
