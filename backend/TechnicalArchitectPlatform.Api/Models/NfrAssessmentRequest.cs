using System.Text.Json;

namespace TechnicalArchitectPlatform.Api.Models;

/// <summary>
/// API request DTO for NFR assessment
/// </summary>
public class NfrAssessmentRequest
{
    public string? Id { get; set; }
    public string? ProjectId { get; set; }
    public JsonElement? Sections { get; set; }
    public JsonElement? CompletionStatus { get; set; }
    public int SchemaVersion { get; set; } = 1;
    public DateTime CreatedAt { get; set; }
    public DateTime LastModified { get; set; }
}
