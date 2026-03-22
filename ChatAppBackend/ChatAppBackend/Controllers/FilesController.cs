using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using System;
using System.IO;
using System.Threading.Tasks;

namespace ChatAppBackend.Controllers
{
    public class FileUploadRequest
    {
        public IFormFile File { get; set; }
    }

    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class FilesController : ControllerBase
    {
        private readonly IAmazonS3 _s3Client;
        private readonly string _bucketName;

        // Inject the S3 client and Configuration
        public FilesController(IAmazonS3 s3Client, IConfiguration configuration)
        {
            _s3Client = s3Client;
            _bucketName = configuration.GetSection("AWS:BucketName").Value
                          ?? throw new ArgumentNullException("Bucket name is missing in configuration.");
        }

        // POST: Upload file to AWS S3
        [HttpPost("upload")]
        public async Task<IActionResult> UploadFile([FromForm] FileUploadRequest request)
        {
            if (request.File == null)
            {
                return BadRequest(new { error = "No file selected for upload." });
            }

            try
            {
                var fileName = Guid.NewGuid().ToString() + Path.GetExtension(request.File.FileName);

                var putRequest = new PutObjectRequest
                {
                    BucketName = _bucketName,
                    Key = fileName,
                    InputStream = request.File.OpenReadStream(),
                    ContentType = request.File.ContentType
                };

                // Send the file stream directly to AWS S3
                await _s3Client.PutObjectAsync(putRequest);

                var fileUrl = $"/api/files/download/{fileName}";

                var usernameClaim = User.FindFirst("username")?.Value
                                 ?? User.FindFirst("cognito:username")?.Value
                                 ?? "UnknownUser";

                return Ok(new { url = fileUrl, originalName = request.File.FileName, uploadedBy = usernameClaim });
            }
            catch (AmazonS3Exception s3Ex)
            {
                return StatusCode(500, new { error = $"AWS S3 error: {s3Ex.Message}" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Internal server error: {ex.Message}" });
            }
        }

        // GET: Download file from AWS S3
        [HttpGet("download/{fileName}")]
        public async Task<IActionResult> DownloadFile(string fileName)
        {
            try
            {
                var getRequest = new GetObjectRequest
                {
                    BucketName = _bucketName,
                    Key = fileName
                };

                // Fetch the file from S3
                var response = await _s3Client.GetObjectAsync(getRequest);

                // Return the S3 response stream directly to the client
                return File(response.ResponseStream, response.Headers.ContentType, fileName);
            }
            catch (AmazonS3Exception s3Ex) when (s3Ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return NotFound(new { error = "File not found in the S3 bucket." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Error downloading file: {ex.Message}" });
            }
        }
    }
}