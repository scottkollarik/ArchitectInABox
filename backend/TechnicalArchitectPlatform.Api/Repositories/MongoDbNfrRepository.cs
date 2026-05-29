using MongoDB.Bson;
using MongoDB.Bson.IO;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;
using System.Text.Json;
using TechnicalArchitectPlatform.Api.Models;

namespace TechnicalArchitectPlatform.Api.Repositories;

public class MongoDbNfrRepository : INfrRepository
{
    private readonly IMongoDatabase _database;
    private readonly IMongoCollection<NfrAssessmentDocument> _collection;

    public MongoDbNfrRepository(IMongoClient client, string databaseName = "tapdb")
    {
        _database = client.GetDatabase(databaseName);
        _collection = _database.GetCollection<NfrAssessmentDocument>("nfrAssessments");
    }

    public async Task<NfrAssessmentResponse?> GetByProjectIdAsync(string projectId, CancellationToken ct = default)
    {
        var document = await _collection.Find(x => x.ProjectId == projectId).FirstOrDefaultAsync(ct);
        return document != null ? ToResponse(document) : null;
    }

    public async Task<NfrAssessmentResponse> UpsertAsync(NfrAssessmentDocument document, CancellationToken ct = default)
    {
        await _collection.ReplaceOneAsync(
            x => x.ProjectId == document.ProjectId,
            document,
            new ReplaceOptions { IsUpsert = true },
            ct);
        return ToResponse(document);
    }

    public async Task<bool> DeleteByProjectIdAsync(string projectId, CancellationToken ct = default)
    {
        var result = await _collection.DeleteOneAsync(x => x.ProjectId == projectId, ct);
        return result.DeletedCount > 0;
    }

    private NfrAssessmentResponse ToResponse(NfrAssessmentDocument doc) => new()
    {
        Id = doc.Id,
        ProjectId = doc.ProjectId,
        Sections = FromBsonValue(doc.Sections),
        CompletionStatus = FromBsonValue(doc.CompletionStatus),
        SchemaVersion = doc.SchemaVersion,
        CreatedAt = doc.CreatedAt,
        LastModified = doc.LastModified
    };

    private JsonElement? FromBsonValue(BsonValue? value)
    {
        if (value is null || value.IsBsonNull) return null;
        var json = value.ToJson(new JsonWriterSettings { OutputMode = JsonOutputMode.CanonicalExtendedJson });
        using var document = JsonDocument.Parse(json);
        return document.RootElement.Clone();
    }
}
