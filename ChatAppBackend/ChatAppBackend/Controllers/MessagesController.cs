using ChatAppBackend.Models;
using Microsoft.AspNetCore.Mvc;

namespace ChatAppBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MessagesController : ControllerBase
    {
        private static readonly List<ChatMessage> _messages = new();

        // GET for retrieving all messages
        [HttpGet]
        public IActionResult GetMessages()
        {
            return Ok(_messages);
        }

        //POST: Sending a new message
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