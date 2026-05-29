using System.Text.Json;

namespace TechnicalArchitectPlatform.Api.Models;

/// <summary>
/// API response DTO for project data
/// </summary>
public class ProjectResponse
{
    public string Id { get; set; } = string.Empty;
    public string OwnerScope { get; set; } = "user";
    public string OwnerId { get; set; } = string.Empty;
    public string? OrgId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public JsonElement? Profile { get; set; }
    public JsonElement? Cloud { get; set; }
    public JsonElement? Constraints { get; set; }
    public JsonElement? Architecture { get; set; }
    public List<ProjectCollaborator> Collaborators { get; set; } = new();
    public int SchemaVersion { get; set; } = 1;
    public DateTime CreatedAt { get; set; }
    public DateTime LastModified { get; set; }
}

/// <summary>
/// Project collaborator DTO
/// </summary>
public class ProjectCollaborator
{
    public string PrincipalType { get; set; } = "user";
    public string PrincipalId { get; set; } = string.Empty;
    public string Role { get; set; } = "reader";
    public DateTime AddedAt { get; set; }
}
