using ChatAppBackend.Data;
using ChatAppBackend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace ChatAppBackend.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class MessagesController : ControllerBase
    {
        private readonly ChatDbContext _context;

        // Inject the database context
        public MessagesController(ChatDbContext context)
        {
            _context = context;
        }

        //GET: Fetch all messages from the database
        [HttpGet]
        public async Task<IActionResult> GetMessages()
        {
            try
            {
                var messages = await _context.Messages.ToListAsync();
                return Ok(messages);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Database error: {ex.Message}" });
            }
        }

        //POST: Save a new message to the database
        [HttpPost]
        public async Task<IActionResult> PostMessage([FromBody] ChatMessage message)
        {
            if (message == null)
            {
                return BadRequest(new { error = "Invalid message data." });
            }

            try
            {
                // Extract the username directly from the Cognito JWT token claims
                var usernameClaim = User.FindFirst("username")?.Value
                                 ?? User.FindFirst("cognito:username")?.Value
                                 ?? "UnknownUser";

                // Override whatever the client sent
                message.Username = usernameClaim;
                message.Id = 0;
                message.Timestamp = DateTime.Now.ToString("HH:mm:ss");

                _context.Messages.Add(message);
                await _context.SaveChangesAsync();

                return Ok(message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Database error: {ex.Message}" });
            }
        }
    }
}