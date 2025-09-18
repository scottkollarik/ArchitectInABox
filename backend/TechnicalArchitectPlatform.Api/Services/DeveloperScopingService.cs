using System.Security.Claims;

namespace TechnicalArchitectPlatform.Api.Services;

/// <summary>
/// Handles developer-scoped data for shared development environments
/// Ensures each developer's data is isolated in shared cloud services
/// </summary>
public interface IDeveloperScopingService
{
    string GetDeveloperScope(ClaimsPrincipal user);
    string GetScopedCollectionName(string baseCollectionName, ClaimsPrincipal user);
    string GetScopedContainerName(string baseContainerName, ClaimsPrincipal user);
    bool IsSharedDevelopmentMode();
}

public class DeveloperScopingService : IDeveloperScopingService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<DeveloperScopingService> _logger;

    public DeveloperScopingService(IConfiguration configuration, ILogger<DeveloperScopingService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public string GetDeveloperScope(ClaimsPrincipal user)
    {
        // In shared development, scope data by developer
        if (IsSharedDevelopmentMode())
        {
            // Option 1: Use configured developer ID (for anonymous dev)
            var configuredDevId = _configuration["DEVELOPER_ID"];
            if (!string.IsNullOrEmpty(configuredDevId))
            {
                return configuredDevId.ToLowerInvariant();
            }

            // Option 2: Use OAuth user info (for authenticated dev)
            if (user?.Identity?.IsAuthenticated == true)
            {
                var email = user.FindFirst("preferred_username")?.Value ?? user.FindFirst("email")?.Value;
                if (!string.IsNullOrEmpty(email))
                {
                    // Use part of email as scope (e.g., john.doe@company.com -> john-doe)
                    var username = email.Split('@')[0].Replace('.', '-').ToLowerInvariant();
                    return username;
                }

                // Fallback to user ID
                var userId = user.FindFirst("oid")?.Value;
                if (!string.IsNullOrEmpty(userId))
                {
                    return userId[..8].ToLowerInvariant(); // First 8 chars of user ID
                }
            }

            // Fallback: use machine name
            return Environment.MachineName.ToLowerInvariant().Replace(" ", "-");
        }

        // In production/docker, no scoping needed
        return "global";
    }

    public string GetScopedCollectionName(string baseCollectionName, ClaimsPrincipal user)
    {
        var scope = GetDeveloperScope(user);

        if (scope == "global")
        {
            return baseCollectionName;
        }

        var scopedName = $"{baseCollectionName}-{scope}";
        _logger.LogDebug("Scoped collection: {BaseCollection} -> {ScopedCollection}", baseCollectionName, scopedName);

        return scopedName;
    }

    public string GetScopedContainerName(string baseContainerName, ClaimsPrincipal user)
    {
        var scope = GetDeveloperScope(user);

        if (scope == "global")
        {
            return baseContainerName;
        }

        var scopedName = $"{baseContainerName}-{scope}";
        _logger.LogDebug("Scoped container: {BaseContainer} -> {ScopedContainer}", baseContainerName, scopedName);

        return scopedName;
    }

    public bool IsSharedDevelopmentMode()
    {
        // Check if we're in shared development mode
        var enableScoping = _configuration.GetValue<bool>("ENABLE_DEVELOPER_SCOPING");
        var environment = _configuration["ASPNETCORE_ENVIRONMENT"];

        return enableScoping || environment == "SharedDevelopment";
    }
}

// Extension methods for easy use
public static class DeveloperScopingExtensions
{
    public static IServiceCollection AddDeveloperScoping(this IServiceCollection services)
    {
        services.AddScoped<IDeveloperScopingService, DeveloperScopingService>();
        return services;
    }
}