using System.Net.Http.Json;

namespace TechnicalArchitectPlatform.Api.Vector;

internal sealed class QdrantVectorIndex : IVectorIndex
{
    private readonly HttpClient _http;
    private readonly string _url;
    private readonly string _collection;
    private readonly string? _apiKey;

    public QdrantVectorIndex(HttpClient http, string url, string collection = "tap-chunks", string? apiKey = null)
    {
        _http = http;
        _url = url.TrimEnd('/');
        _collection = collection;
        _apiKey = apiKey;
        if (!string.IsNullOrEmpty(_apiKey)) _http.DefaultRequestHeaders.Add("api-key", _apiKey);
    }

    public async Task<bool> HealthAsync(CancellationToken ct)
    {
        try
        {
            using var resp = await _http.GetAsync(new Uri($"{_url}/healthz"), ct);
            return resp.IsSuccessStatusCode;
        }
        catch { return false; }
    }

    public async Task UpsertAsync(IEnumerable<VectorChunk> chunks, CancellationToken ct)
    {
        var points = chunks.Select(c => new {
            id = c.Id,
            vector = c.Embedding,
            payload = new Dictionary<string, object?>(c.Payload)
            {
                ["projectId"] = c.ProjectId,
                ["artifactId"] = c.ArtifactId,
                ["text"] = c.Text
            }
        }).ToArray();
        var body = new { points };
        var resp = await _http.PutAsJsonAsync(new Uri($"{_url}/collections/{_collection}/points"), body, ct);
        resp.EnsureSuccessStatusCode();
    }

    public async Task<IReadOnlyList<VectorHit>> QueryAsync(string projectId, float[] embedding, int topK, IDictionary<string, object?>? filter, CancellationToken ct)
    {
        var must = new List<object>
        {
            new { key = "projectId", match = new { value = projectId } }
        };
        if (filter != null)
        {
            foreach (var kv in filter)
            {
                must.Add(new { key = kv.Key, match = new { value = kv.Value } });
            }
        }
        var body = new
        {
            vector = embedding,
            limit = topK,
            with_payload = true,
            with_vector = false,
            filter = new { must }
        };
        var resp = await _http.PostAsJsonAsync(new Uri($"{_url}/collections/{_collection}/points/search"), body, ct);
        resp.EnsureSuccessStatusCode();
        var json = await resp.Content.ReadFromJsonAsync<QdrantSearchResponse>(cancellationToken: ct);
        var hits = json?.result?.Select(r => new VectorHit(r.id?.ToString() ?? string.Empty, r.score, (r.payload?.ContainsKey("text") == true ? r.payload["text"] as string ?? string.Empty : string.Empty), r.payload ?? new())).ToList() ?? new();
        return hits;
    }

    public async Task DeleteByArtifactAsync(string projectId, string artifactId, CancellationToken ct)
    {
        var body = new { filter = new { must = new object[]
        {
            new { key = "projectId", match = new { value = projectId } },
            new { key = "artifactId", match = new { value = artifactId } }
        } } };
        var resp = await _http.PostAsJsonAsync(new Uri($"{_url}/collections/{_collection}/points/delete"), body, ct);
        resp.EnsureSuccessStatusCode();
    }

    private sealed class QdrantSearchResponse
    {
        public bool status { get; set; }
        public List<PointResult>? result { get; set; }
    }
    private sealed class PointResult
    {
        public object id { get; set; } = default!;
        public double score { get; set; }
        public Dictionary<string, object?>? payload { get; set; }
    }
}

