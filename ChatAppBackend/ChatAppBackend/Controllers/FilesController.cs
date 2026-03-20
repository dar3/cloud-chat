using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.IO;
using System.Threading.Tasks;

namespace ChatAppBackend.Controllers
{
    // DTO class to strictly bind the multipart/form-data request
    public class FileUploadRequest
    {
        public IFormFile File { get; set; }
        public string Username { get; set; } = "Anonymous";
    }

    [Route("api/[controller]")]
    [ApiController]
    public class FilesController : ControllerBase
    {
        private readonly string _uploadFolder;

        public FilesController()
        {
            _uploadFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads");
            if (!Directory.Exists(_uploadFolder))
            {
                Directory.CreateDirectory(_uploadFolder);
            }
        }

        // POST: Upload file to the server
        [HttpPost("upload")]
        public async Task<IActionResult> UploadFile([FromForm] FileUploadRequest request)
        {
            // The [ApiController] attribute automatically handles basic validation,
            // but double-check if the file has content.
            if (request.File == null)
            {
                return BadRequest(new { error = "No file selected for upload." });
            }

            try
            {
                var fileName = Guid.NewGuid().ToString() + Path.GetExtension(request.File.FileName);
                var filePath = Path.Combine(_uploadFolder, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await request.File.CopyToAsync(stream);
                }

                var fileUrl = $"/api/files/download/{fileName}";

                return Ok(new { url = fileUrl, originalName = request.File.FileName });
            }
            catch (Exception ex)
            {
                // Return 500 Internal Server Error for actual code exceptions
                return StatusCode(500, new { error = $"Internal server error: {ex.Message}" });
            }
        }

        // GET: Download a multimedia file
        [HttpGet("download/{fileName}")]
        public IActionResult DownloadFile(string fileName)
        {
            var filePath = Path.Combine(_uploadFolder, fileName);

            if (!System.IO.File.Exists(filePath))
            {
                return NotFound(new { error = "File not found on the server." });
            }

            var fileBytes = System.IO.File.ReadAllBytes(filePath);
            return File(fileBytes, "application/octet-stream", fileName);
        }
    }
}