using System.Text.Json;

namespace TechnicalArchitectPlatform.Api.Models;

/// <summary>
/// API response DTO for NFR assessment
/// </summary>
public class NfrAssessmentResponse
{
    public string Id { get; set; } = string.Empty;
    public string ProjectId { get; set; } = string.Empty;
    public JsonElement? Sections { get; set; }
    public JsonElement? CompletionStatus { get; set; }
    public int SchemaVersion { get; set; } = 1;
    public DateTime CreatedAt { get; set; }
    public DateTime LastModified { get; set; }
}
