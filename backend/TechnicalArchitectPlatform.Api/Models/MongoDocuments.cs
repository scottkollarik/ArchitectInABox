using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TechnicalArchitectPlatform.Api.Models;

// Internal persistence models - not exposed via API

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
    public BsonDocument? Architecture { get; set; }
    [BsonElement("collaborators")]
    public List<ProjectCollaboratorDocument> Collaborators { get; set; } = new();
    public int SchemaVersion { get; set; } = 1;
    public DateTime CreatedAt { get; set; }
    public DateTime LastModified { get; set; }
}

public class ProjectCollaboratorDocument
{
    public string PrincipalType { get; set; } = "user";
    public string PrincipalId { get; set; } = default!;
    public string Role { get; set; } = "reader";
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
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

public class UserDocument
{
    [BsonId]
    public string Id { get; set; } = default!;
    public string Email { get; set; } = string.Empty;
    public string? Name { get; set; }
    public bool IsAuthenticated { get; set; }
    public bool HasCompletedOnboarding { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastSeenAt { get; set; } = DateTime.UtcNow;
}

public class AzureServiceDocument
{
    [BsonId]
    public string Id { get; set; } = default!;  // e.g. "azure-container-apps"
    public string Name { get; set; } = default!;
    public string Category { get; set; } = default!;
    public string Tier { get; set; } = default!;  // IaaS | PaaS | SaaS
    public string Description { get; set; } = default!;
    public string? LongDescription { get; set; }
    public List<string> RequiredDependencies { get; set; } = new();
    public List<string> OptionalDependencies { get; set; } = new();
    public List<string> ConflictsWith { get; set; } = new();
    public List<string> NfrRequirements { get; set; } = new();
    public string ArchitectureRole { get; set; } = "supporting";  // core | supporting | optional
    public ServicePricingDocument Pricing { get; set; } = new();
    public List<string> Tags { get; set; } = new();
    public string? Documentation { get; set; }
    public bool AvailablePublic { get; set; } = true;
    public bool AvailableGov { get; set; } = false;
    public bool IsDeprecated { get; set; } = false;
    public DateTime RefreshedAt { get; set; } = DateTime.UtcNow;
}

public class ServicePricingDocument
{
    public string Tier { get; set; } = string.Empty;
    public string Estimate { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public string? Calculator { get; set; }
}

public class NfrRecommendationRuleDocument
{
    [BsonId]
    public string Id { get; set; } = default!;  // e.g. "high-rps-stateless"
    public string NfrQuestionId { get; set; } = default!;  // e.g. "expected-rps"
    public string Condition { get; set; } = default!;  // human-readable, e.g. "> 1000 req/s"
    public List<string> RecommendedServiceIds { get; set; } = new();
    public List<string> DiscouragedServiceIds { get; set; } = new();
    public string Rationale { get; set; } = string.Empty;
    public int Priority { get; set; } = 5;  // 1 (highest) - 10 (lowest)
    public DateTime RefreshedAt { get; set; } = DateTime.UtcNow;
}

public class CatalogRefreshRunDocument
{
    [BsonId]
    public string Id { get; set; } = default!;
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public bool Success { get; set; }
    public int ServicesUpserted { get; set; }
    public int RecommendationRulesUpserted { get; set; }
    public string? ErrorMessage { get; set; }
}
