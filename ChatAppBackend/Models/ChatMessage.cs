namespace ChatAppBackend.Models
{
    public class ChatMessage
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string Timestamp { get; set; } = DateTime.Now.ToString("HH:mm:ss");
        public bool IsFile { get; set; } = false;
        public string FileUrl { get; set; } = string.Empty;
    }
}