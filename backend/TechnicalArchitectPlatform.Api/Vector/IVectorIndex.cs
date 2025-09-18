namespace TechnicalArchitectPlatform.Api.Vector;

public record VectorChunk(
    string Id,
    string ProjectId,
    string? ArtifactId,
    float[] Embedding,
    string Text,
    IDictionary<string, object?> Payload
);

public record VectorHit(
    string Id,
    double Score,
    string Text,
    IDictionary<string, object?> Payload
);

public interface IVectorIndex
{
    Task<bool> HealthAsync(CancellationToken ct);
    Task UpsertAsync(IEnumerable<VectorChunk> chunks, CancellationToken ct);
    Task<IReadOnlyList<VectorHit>> QueryAsync(string projectId, float[] embedding, int topK, IDictionary<string, object?>? filter, CancellationToken ct);
    Task DeleteByArtifactAsync(string projectId, string artifactId, CancellationToken ct);
}

