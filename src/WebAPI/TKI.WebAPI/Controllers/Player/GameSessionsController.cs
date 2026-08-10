using MediatR;
using Microsoft.AspNetCore.Mvc;
using TKI.Application.Features.GameSessions.Commands.CreateGameSession;
using TKI.Application.Features.GameSessions.Commands.FinishGameSession;
using TKI.Application.Features.GameSessions.Commands.JoinGameSession;
using TKI.Application.Features.GameSessions.Commands.MoveToNextQuestion;
using TKI.Application.Features.GameSessions.Commands.StartGameSession;
using TKI.Application.Features.GameSessions.Commands.SubmitAnswer;
using TKI.Application.Features.GameSessions.Commands.UseJoker;
using TKI.Application.Features.GameSessions.Queries.GetCurrentQuestion;
using TKI.Application.Features.GameSessions.Queries.GetGameSessionState;
using TKI.Application.Features.GameSessions.Queries.GetScoreboard;
using TKI.Application.Features.GameSessions.Queries.GetSessionParticipants;

namespace TKI.WebAPI.Controllers.Player;

[Route("api/player/game-sessions")]
public class GameSessionsController : PlayerBaseController
{
    private readonly IMediator _mediator;

    public GameSessionsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateGameSessionCommand command)
    {
        var session = await _mediator.Send(command);
        return Created($"/api/player/game-sessions/{session.Id}", session);
    }

    [HttpPost("join")]
    public async Task<IActionResult> Join([FromBody] JoinGameSessionCommand command)
    {
        var result = await _mediator.Send(command);
        return Ok(result);
    }

    [HttpGet("{id:guid}/state")]
    public async Task<IActionResult> GetState(Guid id)
    {
        var state = await _mediator.Send(new GetGameSessionStateQuery(id));
        return Ok(state);
    }

    [HttpPost("{id:guid}/start")]
    public async Task<IActionResult> Start(Guid id)
    {
        var state = await _mediator.Send(new StartGameSessionCommand(id));
        return Ok(state);
    }

    [HttpPost("{id:guid}/next-question")]
    public async Task<IActionResult> NextQuestion(Guid id)
    {
        var state = await _mediator.Send(new MoveToNextQuestionCommand(id));
        return Ok(state);
    }

    [HttpPost("{id:guid}/finish")]
    public async Task<IActionResult> Finish(Guid id)
    {
        var state = await _mediator.Send(new FinishGameSessionCommand(id));
        return Ok(state);
    }

    [HttpGet("{id:guid}/question")]
    public async Task<IActionResult> GetQuestion(Guid id, [FromQuery] Guid playerId)
    {
        var question = await _mediator.Send(new GetCurrentQuestionQuery(id, playerId));
        return Ok(question);
    }

    [HttpPost("{id:guid}/answers")]
    public async Task<IActionResult> SubmitAnswer(Guid id, [FromBody] SubmitAnswerCommand command)
    {
        var result = await _mediator.Send(command with { GameSessionId = id });
        return Ok(result);
    }

    [HttpPost("{id:guid}/jokers")]
    public async Task<IActionResult> UseJoker(Guid id, [FromBody] UseJokerCommand command)
    {
        await _mediator.Send(command with { GameSessionId = id });
        return NoContent();
    }

    [HttpGet("{id:guid}/scoreboard")]
    public async Task<IActionResult> Scoreboard(Guid id)
    {
        var scoreboard = await _mediator.Send(new GetScoreboardQuery(id));
        return Ok(scoreboard);
    }

    [HttpGet("{id:guid}/participants")]
    public async Task<IActionResult> Participants(Guid id)
    {
        var participants = await _mediator.Send(new GetSessionParticipantsQuery(id));
        return Ok(participants);
    }
}
