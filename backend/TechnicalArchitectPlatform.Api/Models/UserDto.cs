namespace TechnicalArchitectPlatform.Api.Models;

public record UserDto(
    string Id,
    string Provider,
    string Subject,
    string Email,
    string DisplayName,
    string? TenantId
);

