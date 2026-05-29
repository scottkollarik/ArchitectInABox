using MongoDB.Driver;
using TechnicalArchitectPlatform.Api.Auth;
using TechnicalArchitectPlatform.Api.Models;

namespace TechnicalArchitectPlatform.Api.Repositories;

public class MongoDbUserRepository : IUserRepository
{
    private readonly IMongoDatabase _database;
    private readonly IMongoCollection<UserDocument> _collection;

    public MongoDbUserRepository(IMongoClient client, string databaseName = "tapdb")
    {
        _database = client.GetDatabase(databaseName);
        _collection = _database.GetCollection<UserDocument>("users");
    }

    public async Task UpsertUserAsync(UserInfo userInfo, CancellationToken ct = default)
    {
        var update = Builders<UserDocument>.Update
            .Set(u => u.Email, userInfo.Email)
            .Set(u => u.Name, userInfo.Name)
            .Set(u => u.IsAuthenticated, userInfo.IsAuthenticated)
            .Set(u => u.LastSeenAt, DateTime.UtcNow)
            .SetOnInsert(u => u.CreatedAt, DateTime.UtcNow)
            .SetOnInsert(u => u.HasCompletedOnboarding, false);

        await _collection.UpdateOneAsync(
            u => u.Id == userInfo.Id,
            update,
            new UpdateOptions { IsUpsert = true },
            ct);
    }

    public async Task<UserDocument?> GetUserByIdAsync(string userId, CancellationToken ct = default)
    {
        return await _collection.Find(u => u.Id == userId).FirstOrDefaultAsync(ct);
    }

    public async Task CompleteOnboardingAsync(string userId, CancellationToken ct = default)
    {
        var update = Builders<UserDocument>.Update
            .Set(u => u.HasCompletedOnboarding, true);

        await _collection.UpdateOneAsync(
            u => u.Id == userId,
            update,
            cancellationToken: ct);
    }
}
