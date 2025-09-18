namespace TechnicalArchitectPlatform.Api.Models;

public record BlueprintDto(
    string Id,
    string OwnerScope, // org | project
    string OwnerId,
    string Name,
    string Version,
    BlueprintConstraintsDto Constraints,
    string? Notes,
    string CreatedBy,
    DateTime CreatedAt,
    int SchemaVersion
);

public record BlueprintConstraintsDto(
    string[]? AllowServiceIds,
    string[]? DenyServiceIds,
    NfrFieldLockDto[]? NfrLocks
);

