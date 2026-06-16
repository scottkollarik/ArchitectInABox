namespace TechnicalArchitectPlatform.Api.Auth;

/// <summary>
/// Where the caller's identity is allowed to come from for a given request.
/// </summary>
public enum IdentitySource
{
    /// <summary>Trust the validated JWT claims.</summary>
    Token,

    /// <summary>Trust spoofable request headers/query (development convenience only).</summary>
    DevHeaders,

    /// <summary>Refuse: no trustworthy identity is available — fail closed.</summary>
    Denied
}

/// <summary>
/// Decides which identity source is permitted. Extracted as a pure function so the
/// security policy is unit-testable in isolation from the HTTP pipeline.
///
/// Security note: header/query identity is spoofable and is only ever honored in a
/// development environment. In any non-development environment the API fails closed,
/// so a misconfigured <c>authEnabled</c> flag can never silently turn a public
/// ingress into an open impersonation surface.
/// </summary>
public static class UserIdentityPolicy
{
    public static IdentitySource DecideSource(bool authEnabled, bool isAuthenticated, bool isDevelopment)
    {
        if (authEnabled && isAuthenticated)
        {
            return IdentitySource.Token;
        }

        return isDevelopment ? IdentitySource.DevHeaders : IdentitySource.Denied;
    }
}

/// <summary>
/// Thrown when no trustworthy identity is available and header fallback is not permitted.
/// Mapped to HTTP 401 by middleware in Program.cs.
/// </summary>
public sealed class IdentityRequiredException : Exception
{
    public IdentityRequiredException(string message) : base(message) { }
}
