using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TechnicalArchitectPlatform.Api.Models;

public class ProjectDocument
{
    [BsonId]
    public string Id { get; set; } = default!;
    public string OwnerScope { get; set; } = "user";
    public string OwnerId { get; set; } = default!;
    public string? OrgId { get; set; }
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
    public BsonDocument? Profile { get; set; }
    public BsonDocument? Cloud { get; set; }
    public BsonDocument? BlueprintAssociation { get; set; }
    public BsonDocument? Constraints { get; set; }
    public int SchemaVersion { get; set; } = 1;
    public DateTime CreatedAt { get; set; }
    public DateTime LastModified { get; set; }
}

public class NfrAssessmentDocument
{
    [BsonId]
    public string Id { get; set; } = default!;
    public string ProjectId { get; set; } = default!;
    public BsonValue Sections { get; set; } = BsonNull.Value;
    public BsonValue CompletionStatus { get; set; } = BsonNull.Value;
    public int SchemaVersion { get; set; } = 1;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastModified { get; set; } = DateTime.UtcNow;
}
