using ChatAppBackend.Models;
using Microsoft.AspNetCore.Mvc;

namespace ChatAppBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MessagesController : ControllerBase
    {
        // Simple list to store chat messages in memory (for demonstration purposes)
        private static readonly List<ChatMessage> _messages = new();

        // 1 GET for retrieving all messages
        [HttpGet]
        public IActionResult GetMessages()
        {
            return Ok(_messages);
        }

        // 2. POST: Sending a new message
        [HttpPost]
        public IActionResult PostMessage([FromBody] ChatMessage message)
        {
            message.Id = _messages.Count + 1;
            message.Timestamp = DateTime.Now.ToString("HH:mm:ss");
            _messages.Add(message);
            return Ok(message);
        }
    }
}