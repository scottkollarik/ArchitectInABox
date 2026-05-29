using TechnicalArchitectPlatform.Api.Auth;
using TechnicalArchitectPlatform.Api.Models;

namespace TechnicalArchitectPlatform.Api.Repositories;

public interface IUserRepository
{
    Task UpsertUserAsync(UserInfo userInfo, CancellationToken ct = default);
    Task<UserDocument?> GetUserByIdAsync(string userId, CancellationToken ct = default);
    Task CompleteOnboardingAsync(string userId, CancellationToken ct = default);
}
