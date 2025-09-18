namespace TechnicalArchitectPlatform.Api.Models;

public record ProjectDto(
    string Id,
    string OwnerScope, // 'user' | 'org'
    string OwnerId,
    string? OrgId,
    string Name,
    string? Description,
    ProjectProfileDto? Profile,
    ProjectCloudConfigDto? Cloud,
    BlueprintAssociationDto? BlueprintAssociation,
    ProjectConstraintsDto? Constraints,
    int SchemaVersion,
    DateTime CreatedAt,
    DateTime LastModified
);

public record ProjectProfileDto(
    string Level, // starter | standard | enterprise | custom
    string Size,  // XS|S|M|L|XL|Custom
    string Criticality, // dev/test | prod | regulated
    string? Recipe
);

public record ProjectCloudConfigDto(
    string Provider,
    string CloudFamily,
    string DrStrategy,
    string? PrimaryRegionId,
    string? SecondaryRegionId
);

public record BlueprintAssociationDto(
    string Mode, // inherit | project | none
    string? BlueprintId
);

public record ProjectConstraintsDto(
    string[]? AllowServiceIds,
    string[]? DenyServiceIds,
    string? Notes,
    NfrFieldLockDto[]? NfrLocks
);

public record NfrFieldLockDto(
    string Path,
    string Mode,
    string[]? AllowedValues
);

