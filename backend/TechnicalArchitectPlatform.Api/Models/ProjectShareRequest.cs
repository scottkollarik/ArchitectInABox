namespace TechnicalArchitectPlatform.Api.Models;

public sealed record ProjectShareRequest(string PrincipalType, string PrincipalId, string Role);
