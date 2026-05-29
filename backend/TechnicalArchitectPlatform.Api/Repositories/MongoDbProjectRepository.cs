using MongoDB.Bson;
using MongoDB.Bson.IO;
using MongoDB.Driver;
using System.Text.Json;
using TechnicalArchitectPlatform.Api.Models;

namespace TechnicalArchitectPlatform.Api.Repositories;

public class MongoDbProjectRepository : IProjectRepository
{
    private readonly IMongoDatabase _database;
    private readonly IMongoCollection<ProjectDocument> _collection;

    public MongoDbProjectRepository(IMongoClient client, string databaseName = "tapdb")
    {
        _database = client.GetDatabase(databaseName);
        _collection = _database.GetCollection<ProjectDocument>("projects");
    }

    public async Task<IEnumerable<ProjectResponse>> GetProjectsByUserAsync(string scope, string userId, CancellationToken ct = default)
    {
        var filter = BuildAccessFilter(scope, userId);
        var documents = await _collection.Find(filter).ToListAsync(ct);
        return documents.Select(ToResponse);
    }

    public async Task<ProjectResponse?> GetProjectByIdAsync(string id, CancellationToken ct = default)
    {
        var document = await _collection.Find(x => x.Id == id).FirstOrDefaultAsync(ct);
        return document != null ? ToResponse(document) : null;
    }

    public async Task<ProjectResponse> UpsertProjectAsync(ProjectDocument project, CancellationToken ct = default)
    {
        await _collection.ReplaceOneAsync(
            x => x.Id == project.Id,
            project,
            new ReplaceOptions { IsUpsert = true },
            ct);
        return ToResponse(project);
    }

    public async Task<bool> DeleteProjectAsync(string id, CancellationToken ct = default)
    {
        var result = await _collection.DeleteOneAsync(x => x.Id == id, ct);
        return result.DeletedCount > 0;
    }

    public async Task<bool> HasReadAccessAsync(string projectId, string scope, string userId, CancellationToken ct = default)
    {
        var project = await _collection.Find(x => x.Id == projectId).FirstOrDefaultAsync(ct);
        return project != null && HasReadAccess(project, scope, userId);
    }

    public async Task<bool> HasWriteAccessAsync(string projectId, string scope, string userId, CancellationToken ct = default)
    {
        var project = await _collection.Find(x => x.Id == projectId).FirstOrDefaultAsync(ct);
        return project != null && HasWriteAccess(project, scope, userId);
    }

    public async Task<bool> HasOwnerAccessAsync(string projectId, string scope, string userId, CancellationToken ct = default)
    {
        var project = await _collection.Find(x => x.Id == projectId).FirstOrDefaultAsync(ct);
        return project != null && HasOwnerAccess(project, scope, userId);
    }

    // Helper methods
    private FilterDefinition<ProjectDocument> BuildAccessFilter(string scope, string id)
    {
        var ownerFilter = Builders<ProjectDocument>.Filter.And(
            Builders<ProjectDocument>.Filter.Eq(x => x.OwnerScope, scope),
            Builders<ProjectDocument>.Filter.Eq(x => x.OwnerId, id)
        );
        var collaboratorFilter = Builders<ProjectDocument>.Filter.ElemMatch(x => x.Collaborators,
            c => c.PrincipalType == scope && c.PrincipalId == id);
        return Builders<ProjectDocument>.Filter.Or(ownerFilter, collaboratorFilter);
    }

    private bool HasOwnerAccess(ProjectDocument project, string scope, string id) =>
        project.OwnerScope == scope && project.OwnerId == id;

    private bool HasReadAccess(ProjectDocument project, string scope, string id) =>
        HasOwnerAccess(project, scope, id) ||
        (project.Collaborators?.Any(c => c.PrincipalType == scope && c.PrincipalId == id) ?? false);

    private bool HasWriteAccess(ProjectDocument project, string scope, string id) =>
        HasOwnerAccess(project, scope, id) ||
        (project.Collaborators?.Any(c =>
            c.PrincipalType == scope && c.PrincipalId == id &&
            (c.Role == "owner" || c.Role == "contributor")) ?? false);

    private ProjectResponse ToResponse(ProjectDocument project) => new()
    {
        Id = project.Id,
        OwnerScope = project.OwnerScope,
        OwnerId = project.OwnerId,
        OrgId = project.OrgId,
        Name = project.Name,
        Description = project.Description,
        Profile = FromBson(project.Profile),
        Cloud = FromBson(project.Cloud),
        Constraints = FromBson(project.Constraints),
        Architecture = FromBson(project.Architecture),
        Collaborators = project.Collaborators?.Select(ToCollaboratorDto).ToList() ?? new(),
        SchemaVersion = project.SchemaVersion,
        CreatedAt = project.CreatedAt,
        LastModified = project.LastModified
    };

    private ProjectCollaborator ToCollaboratorDto(ProjectCollaboratorDocument doc) => new()
    {
        PrincipalType = doc.PrincipalType,
        PrincipalId = doc.PrincipalId,
        Role = doc.Role,
        AddedAt = doc.AddedAt
    };

    private JsonElement? FromBson(BsonDocument? doc)
    {
        if (doc is null) return null;
        var json = doc.ToJson(new JsonWriterSettings { OutputMode = JsonOutputMode.CanonicalExtendedJson });
        using var document = JsonDocument.Parse(json);
        return document.RootElement.Clone();
    }

    // Sharing operations
    public async Task<List<ProjectCollaborator>?> GetCollaboratorsAsync(string projectId, CancellationToken ct = default)
    {
        var project = await _collection.Find(x => x.Id == projectId).FirstOrDefaultAsync(ct);
        return project?.Collaborators?.Select(ToCollaboratorDto).ToList();
    }

    public async Task<List<ProjectCollaborator>?> AddOrUpdateCollaboratorAsync(string projectId, ProjectCollaboratorDocument collaborator, CancellationToken ct = default)
    {
        var project = await _collection.Find(x => x.Id == projectId).FirstOrDefaultAsync(ct);
        if (project == null) return null;

        project.Collaborators ??= new();
        project.Collaborators.RemoveAll(c => c.PrincipalType == collaborator.PrincipalType && c.PrincipalId == collaborator.PrincipalId);
        project.Collaborators.Add(collaborator);
        project.LastModified = DateTime.UtcNow;

        await _collection.ReplaceOneAsync(x => x.Id == projectId, project, new ReplaceOptions { IsUpsert = false }, ct);
        return project.Collaborators.Select(ToCollaboratorDto).ToList();
    }

    public async Task<bool> RemoveCollaboratorAsync(string projectId, string principalId, CancellationToken ct = default)
    {
        var project = await _collection.Find(x => x.Id == projectId).FirstOrDefaultAsync(ct);
        if (project == null) return false;

        project.Collaborators ??= new();
        var removed = project.Collaborators.RemoveAll(c => c.PrincipalId == principalId) > 0;
        if (removed)
        {
            project.LastModified = DateTime.UtcNow;
            await _collection.ReplaceOneAsync(x => x.Id == projectId, project, new ReplaceOptions { IsUpsert = false }, ct);
        }
        return removed;
    }
}
