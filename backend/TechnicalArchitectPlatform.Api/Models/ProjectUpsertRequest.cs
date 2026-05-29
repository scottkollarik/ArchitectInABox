using System.Text.Json;

namespace TechnicalArchitectPlatform.Api.Models;

/// <summary>
/// API request DTO for creating/updating projects
/// </summary>
public class ProjectUpsertRequest
{
    public string? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? OrgId { get; set; }
    public JsonElement? Profile { get; set; }
    public JsonElement? Cloud { get; set; }
    public JsonElement? Constraints { get; set; }
    public JsonElement? Architecture { get; set; }
    public List<ProjectCollaborator>? Collaborators { get; set; }
    public int SchemaVersion { get; set; } = 1;
    public DateTime CreatedAt { get; set; }
    public DateTime LastModified { get; set; }
}
