using FluentAssertions;
using TechnicalArchitectPlatform.Api.Auth;

namespace TechnicalArchitectPlatform.Api.Tests.Auth;

/// <summary>
/// Tests for the identity-source security policy.
///
/// The behavior under test is "fail closed": spoofable header/query identity is
/// only ever honored in a development environment. The critical regression case
/// is a production environment where the auth flag is (mis)configured to false —
/// the API must DENY rather than trust attacker-controlled headers.
/// </summary>
public class UserIdentityPolicyTests
{
    [Fact]
    public void Authenticated_with_auth_enabled_uses_token()
    {
        UserIdentityPolicy.DecideSource(authEnabled: true, isAuthenticated: true, isDevelopment: false)
            .Should().Be(IdentitySource.Token);
    }

    [Fact]
    public void Unauthenticated_in_production_is_denied_when_auth_enabled()
    {
        UserIdentityPolicy.DecideSource(authEnabled: true, isAuthenticated: false, isDevelopment: false)
            .Should().Be(IdentitySource.Denied);
    }

    [Fact]
    public void Production_with_auth_disabled_denies_header_identity()
    {
        // Regression guard: a production deploy missing its auth env vars must NOT
        // fall back to trusting X-User-* headers (which would allow impersonation
        // on a public ingress). It must fail closed.
        UserIdentityPolicy.DecideSource(authEnabled: false, isAuthenticated: false, isDevelopment: false)
            .Should().Be(IdentitySource.Denied);
    }

    [Fact]
    public void Development_allows_header_identity_fallback()
    {
        UserIdentityPolicy.DecideSource(authEnabled: false, isAuthenticated: false, isDevelopment: true)
            .Should().Be(IdentitySource.DevHeaders);
    }

    [Fact]
    public void Development_uses_headers_when_unauthenticated_even_with_auth_enabled()
    {
        UserIdentityPolicy.DecideSource(authEnabled: true, isAuthenticated: false, isDevelopment: true)
            .Should().Be(IdentitySource.DevHeaders);
    }

    [Theory]
    // authEnabled, isAuthenticated, isDevelopment, expected
    [InlineData(true, true, false, IdentitySource.Token)]
    [InlineData(true, true, true, IdentitySource.Token)]
    [InlineData(true, false, false, IdentitySource.Denied)]
    [InlineData(false, false, false, IdentitySource.Denied)]
    [InlineData(false, true, false, IdentitySource.Denied)] // authEnabled=false ⇒ token not trusted
    [InlineData(false, false, true, IdentitySource.DevHeaders)]
    [InlineData(true, false, true, IdentitySource.DevHeaders)]
    public void Decision_table(bool authEnabled, bool isAuthenticated, bool isDevelopment, IdentitySource expected)
    {
        UserIdentityPolicy.DecideSource(authEnabled, isAuthenticated, isDevelopment)
            .Should().Be(expected);
    }
}
