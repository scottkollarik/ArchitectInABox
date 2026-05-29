# Repository Pattern Implementation

## Overview

The API has been refactored to use the **Repository Pattern** to abstract data persistence logic from the API endpoints. This provides:

- **Backend Agnosticism**: Switch between MongoDB, CosmosDB (MongoDB API), or future backends without changing API code
- **Clean DTOs**: API responses/requests use standard JSON (`JsonElement`) instead of MongoDB-specific types (`BsonDocument`)
- **Testability**: Repositories can be easily mocked for unit testing
- **Separation of Concerns**: Business logic is separate from data access logic

## Architecture

```
┌─────────────────┐
│  API Endpoints  │  (Program.cs - Minimal API)
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│   Repositories      │  (IProjectRepository, INfrRepository, IUserRepository)
└────────┬────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Implementations (MongoDB | CosmosDB)   │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Database Backend   │
└─────────────────────┘
```

## Data Flow

### Request Flow
1. **Client** → Sends JSON DTO (e.g., `ProjectUpsertRequest`)
2. **API Endpoint** → Converts DTO to persistence model (`ProjectDocument`) using helper functions
3. **Repository** → Converts `JsonElement` to `BsonDocument` (if MongoDB backend)
4. **Database** → Stores data

### Response Flow
1. **Database** → Returns `BsonDocument` (MongoDB) or equivalent
2. **Repository** → Converts to DTO model (`ProjectResponse`) with `JsonElement` fields
3. **API Endpoint** → Returns JSON to client

## Configuration

### Switching Backends

Edit `appsettings.json` or set environment variables:

```json
{
  "Database": {
    "Backend": "mongodb",       // Options: "mongodb" | "cosmosdb"
    "Name": "technical-architect-db"
  },
  "ConnectionStrings": {
    "MongoDB": "mongodb://localhost:27017/technical-architect-db",
    "CosmosDB": "mongodb://your-cosmosdb-account.mongo.cosmos.azure.com:10255/?ssl=true"
  }
}
```

### Backend Options

| Backend    | Configuration Value | Connection String Key | Notes |
|------------|---------------------|----------------------|-------|
| MongoDB    | `mongodb`           | `ConnectionStrings:MongoDB` | Default - Native MongoDB |
| CosmosDB   | `cosmosdb`          | `ConnectionStrings:CosmosDB` | Azure CosmosDB with MongoDB API |

## Repository Implementations

### MongoDB Repositories
- `MongoDbProjectRepository` - Project CRUD operations
- `MongoDbNfrRepository` - NFR assessment operations
- `MongoDbUserRepository` - User tracking operations

### CosmosDB Repositories
- `CosmosDbProjectRepository` - Inherits from MongoDB implementation (uses MongoDB API compatibility)
- `CosmosDbNfrRepository` - Inherits from MongoDB implementation
- `CosmosDbUserRepository` - Inherits from MongoDB implementation

**Note**: CosmosDB implementations currently use the MongoDB compatibility layer. For native CosmosDB SDK, create separate implementations.

## Models

### Persistence Models (MongoDB-specific)
Located in `/Models/MongoDocuments.cs`:
- `ProjectDocument` - Uses `BsonDocument` for nested data
- `NfrAssessmentDocument` - Uses `BsonValue` for flexible schema
- `UserDocument` - Simple entity

### API DTOs (Backend-agnostic)
Located in `/Models/`:
- `ProjectResponse` - Uses `JsonElement` for nested data
- `ProjectUpsertRequest` - Uses `JsonElement` for nested data
- `NfrAssessmentResponse` - Uses `JsonElement` for flexible schema
- `NfrAssessmentRequest` - Uses `JsonElement` for flexible schema

## Conversion Helpers

Helper functions in `Program.cs` handle conversions:

```csharp
// DTO → Persistence Model
BsonDocument? ToBson(JsonElement? element)
BsonValue ToBsonValue(JsonElement? element)

// Persistence Model → DTO (in repositories)
JsonElement? FromBson(BsonDocument? doc)
JsonElement? FromBsonValue(BsonValue? value)
```

## Adding New Repositories

### 1. Define Interface

```csharp
public interface IMyRepository
{
    Task<MyResponse> GetByIdAsync(string id, CancellationToken ct = default);
    Task<MyResponse> UpsertAsync(MyDocument document, CancellationToken ct = default);
}
```

### 2. Implement MongoDB Version

```csharp
public class MongoDbMyRepository : IMyRepository
{
    private readonly IMongoCollection<MyDocument> _collection;

    public MongoDbMyRepository(IMongoClient client, string databaseName)
    {
        var db = client.GetDatabase(databaseName);
        _collection = db.GetCollection<MyDocument>("myCollection");
    }

    public async Task<MyResponse> GetByIdAsync(string id, CancellationToken ct = default)
    {
        var doc = await _collection.Find(x => x.Id == id).FirstOrDefaultAsync(ct);
        return ToResponse(doc);
    }

    // ... implement other methods
}
```

### 3. Register in DI Container

In `Program.cs`:

```csharp
if (dbBackend == "cosmosdb")
{
    builder.Services.AddSingleton<IMyRepository>(sp =>
        new CosmosDbMyRepository(sp.GetRequiredService<IMongoClient>(), dbName));
}
else
{
    builder.Services.AddSingleton<IMyRepository>(sp =>
        new MongoDbMyRepository(sp.GetRequiredService<IMongoClient>(), dbName));
}
```

### 4. Use in Endpoints

```csharp
api.MapGet("/my-resource/{id}", async (IMyRepository repo, string id, CancellationToken ct) =>
{
    var result = await repo.GetByIdAsync(id, ct);
    return result != null ? Results.Ok(result) : Results.NotFound();
});
```

## Migration Notes

### Before (Direct MongoDB Access)
```csharp
api.MapGet("/projects", async (IMongoClient client, HttpContext ctx, CancellationToken ct) =>
{
    var db = client.GetDatabase("technical-architect-db");
    var col = db.GetCollection<ProjectDocument>("projects");
    var list = await col.Find(filter).ToListAsync(ct);
    return Results.Ok(list.Select(ToResponse));
});
```

### After (Repository Pattern)
```csharp
api.MapGet("/projects", async (IProjectRepository projectRepo, IUserRepository userRepo, HttpContext ctx, CancellationToken ct) =>
{
    var userInfo = await GetUserAsync(ctx, userRepo, ct);
    var projects = await projectRepo.GetProjectsByUserAsync("user", userInfo.Id, ct);
    return Results.Ok(projects);
});
```

## Benefits

1. **Type Safety**: DTOs are strongly typed with JSON-agnostic types
2. **Testability**: Easy to mock repositories for unit tests
3. **Flexibility**: Switch backends by changing configuration
4. **Maintainability**: Data access logic centralized in repositories
5. **Future-Proof**: Easy to add new backends (e.g., SQL Server, PostgreSQL)

## Future Enhancements

- [ ] Add native CosmosDB SDK implementations (avoid MongoDB API overhead)
- [ ] Add SQL Server/PostgreSQL implementations
- [ ] Add in-memory repository for integration testing
- [ ] Add caching layer (Redis/in-memory)
- [ ] Add repository base class to reduce boilerplate
