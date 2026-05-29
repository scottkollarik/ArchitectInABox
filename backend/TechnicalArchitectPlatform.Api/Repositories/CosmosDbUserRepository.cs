using MongoDB.Driver;

namespace TechnicalArchitectPlatform.Api.Repositories;

/// <summary>
/// CosmosDB implementation using MongoDB API compatibility layer.
/// Works with both CosmosDB for MongoDB and native MongoDB.
/// </summary>
public class CosmosDbUserRepository : MongoDbUserRepository
{
    public CosmosDbUserRepository(IMongoClient client, string databaseName = "tapdb")
        : base(client, databaseName)
    {
        // CosmosDB with MongoDB API uses the same driver
        // Additional CosmosDB-specific optimizations can be added here if needed
    }
}
