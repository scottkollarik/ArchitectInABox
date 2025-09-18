using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Identity.Web;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text.Json;

namespace TechnicalArchitectPlatform.Api.Auth;

public static class EntraAuthExtensions
{
    public static IServiceCollection AddEntraAuth(this IServiceCollection services, IConfiguration configuration)
    {
        // Get OAuth configuration from environment
        var clientId = configuration["EntraAuth:ClientId"] ?? Environment.GetEnvironmentVariable("VITE_OAUTH_CLIENT_ID");
        var tenantId = configuration["EntraAuth:TenantId"] ?? Environment.GetEnvironmentVariable("VITE_OAUTH_TENANT_ID");
        var instance = configuration["EntraAuth:Instance"] ?? "https://login.microsoftonline.com/";

        if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(tenantId))
        {
            // If no OAuth config, allow anonymous access for development
            Console.WriteLine("⚠️  No Entra ID configuration found. Running in anonymous mode for development.");
            return services;
        }

        // Configure JWT Bearer authentication with Microsoft Identity
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddMicrosoftIdentityWebApi(jwtOptions =>
            {
                // Configure token validation
                jwtOptions.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ClockSkew = TimeSpan.FromMinutes(5)
                };

                // Handle authentication events
                jwtOptions.Events = new JwtBearerEvents
                {
                    OnAuthenticationFailed = context =>
                    {
                        Console.WriteLine($"Authentication failed: {context.Exception.Message}");
                        return Task.CompletedTask;
                    },
                    OnTokenValidated = context =>
                    {
                        var userId = context.Principal?.FindFirst("oid")?.Value;
                        var userEmail = context.Principal?.FindFirst("preferred_username")?.Value;
                        Console.WriteLine($"Token validated for user: {userEmail} (ID: {userId})");
                        return Task.CompletedTask;
                    }
                };
            },
            microsoftIdentityOptions =>
            {
                microsoftIdentityOptions.Instance = instance;
                microsoftIdentityOptions.TenantId = tenantId;
                microsoftIdentityOptions.ClientId = clientId;
            });

        // Add authorization
        services.AddAuthorization(options =>
        {
            options.AddPolicy("RequireAuthenticatedUser", policy =>
            {
                policy.RequireAuthenticatedUser();
            });
        });

        return services;
    }

    public static WebApplication UseEntraAuth(this WebApplication app)
    {
        var clientId = app.Configuration["EntraAuth:ClientId"] ?? Environment.GetEnvironmentVariable("VITE_OAUTH_CLIENT_ID");

        if (!string.IsNullOrEmpty(clientId))
        {
            app.UseAuthentication();
            app.UseAuthorization();
            Console.WriteLine("✅ Entra ID authentication enabled");
        }
        else
        {
            Console.WriteLine("⚠️  Running without authentication (development mode)");
        }

        return app;
    }
}

// Extension to get user information from JWT token
public static class UserExtensions
{
    public static string? GetUserId(this ClaimsPrincipal user)
    {
        return user?.FindFirst("oid")?.Value;
    }

    public static string? GetUserEmail(this ClaimsPrincipal user)
    {
        return user?.FindFirst("preferred_username")?.Value ??
               user?.FindFirst("email")?.Value;
    }

    public static string? GetUserName(this ClaimsPrincipal user)
    {
        return user?.FindFirst("name")?.Value ??
               user?.FindFirst("given_name")?.Value;
    }

    public static bool IsAuthenticated(this ClaimsPrincipal user)
    {
        return user?.Identity?.IsAuthenticated == true;
    }
}

public record UserInfo(
    string Id,
    string Email,
    string Name,
    bool IsAuthenticated
);

public static class UserInfoExtensions
{
    public static UserInfo GetUserInfo(this ClaimsPrincipal user)
    {
        return new UserInfo(
            user.GetUserId() ?? "anonymous",
            user.GetUserEmail() ?? "anonymous@localhost",
            user.GetUserName() ?? "Anonymous User",
            user.IsAuthenticated()
        );
    }
}