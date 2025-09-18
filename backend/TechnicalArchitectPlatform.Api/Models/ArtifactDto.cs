namespace TechnicalArchitectPlatform.Api.Models;

public record ArtifactDto(
    string Id,
    ArtifactScope Scope,
    string Name,
    string ContentType,
    long Size,
    string? Category,
    string? BlobUri,
    string CreatedBy,
    DateTime CreatedAt,
    int SchemaVersion
);

public record ArtifactScope(
    string Type, // project | org
    string Id
);

