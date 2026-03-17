using ChatAppBackend.Models;
using Microsoft.AspNetCore.Mvc;
using System.IO;

namespace ChatAppBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FilesController : ControllerBase
    {
        private readonly string _uploadFolder;

        public FilesController()
        {
            // Create the "Uploads" directory in the current working directory if it doesn't exist
            _uploadFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads");
            if (!Directory.Exists(_uploadFolder))
            {
                Directory.CreateDirectory(_uploadFolder);
            }
        }

        // POST for uploading a file
        [HttpPost("upload")]
        public async Task<IActionResult> UploadFile([FromForm] IFormFile file, [FromForm] string? username)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Brak pliku do wgrania.");

            // Generating a unique file name to avoid conflicts
            var fileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
            var filePath = Path.Combine(_uploadFolder, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Generating the URL for downloading the file
            var fileUrl = $"/api/files/download/{fileName}";

            return Ok(new { url = fileUrl, originalName = file.FileName });
        }

        // GET for downloading a file
        [HttpGet("download/{fileName}")]
        public IActionResult DownloadFile(string fileName)
        {
            var filePath = Path.Combine(_uploadFolder, fileName);

            if (!System.IO.File.Exists(filePath))
                return NotFound("Plik nie istnieje na serwerze.");

            // Returning the file as a download
            var fileBytes = System.IO.File.ReadAllBytes(filePath);
            return File(fileBytes, "application/octet-stream", fileName);
        }
    }
}