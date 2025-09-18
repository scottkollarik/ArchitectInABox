using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using System.Collections.Concurrent;

namespace TechnicalArchitectPlatform.Api.Artifacts;

public record ArtifactInfo(
    string Id,
    string Name,
    string ContentType,
    long Size,
    DateTimeOffset CreatedAt,
    string? Url = null,
    string? Category = null
);

public interface IArtifactStore
{
    Task<ArtifactInfo> UploadAsync(string projectId, string fileName, string contentType, Stream content, string? category, CancellationToken ct);
    Task<(Stream Stream, ArtifactInfo Info)> DownloadAsync(string projectId, string artifactId, CancellationToken ct);
    IAsyncEnumerable<ArtifactInfo> ListAsync(string projectId, CancellationToken ct);
}

public class InMemoryArtifactStore : IArtifactStore
{
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<string, (byte[] Data, ArtifactInfo Info)>> _store = new();

    public Task<ArtifactInfo> UploadAsync(string projectId, string fileName, string contentType, Stream content, string? category, CancellationToken ct)
    {
        var proj = _store.GetOrAdd(projectId, _ => new());
        var id = Guid.NewGuid().ToString("n");
        using var ms = new MemoryStream();
        content.CopyTo(ms);
        var data = ms.ToArray();
        var info = new ArtifactInfo(id, fileName, contentType, data.LongLength, DateTimeOffset.UtcNow, null, category);
        proj[id] = (data, info);
        return Task.FromResult(info);
    }

    public Task<(Stream Stream, ArtifactInfo Info)> DownloadAsync(string projectId, string artifactId, CancellationToken ct)
    {
        if (_store.TryGetValue(projectId, out var proj) && proj.TryGetValue(artifactId, out var entry))
        {
            return Task.FromResult<(Stream, ArtifactInfo)>((new MemoryStream(entry.Data, writable:false), entry.Info));
        }
        throw new FileNotFoundException("Artifact not found");
    }

    public async IAsyncEnumerable<ArtifactInfo> ListAsync(string projectId, [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct)
    {
        if (_store.TryGetValue(projectId, out var proj))
        {
            foreach (var kv in proj.Values)
            {
                yield return kv.Info;
                await Task.Yield();
            }
        }
    }
}

    public class AzureBlobArtifactStore : IArtifactStore
    {
        private readonly BlobServiceClient _serviceClient;
        private readonly string _containerName;

    public AzureBlobArtifactStore(BlobServiceClient serviceClient, string containerName = "ta-project-artifacts")
    {
        _serviceClient = serviceClient;
        _containerName = containerName;
    }

    private async Task<BlobContainerClient> GetContainerAsync(CancellationToken ct)
    {
        var container = _serviceClient.GetBlobContainerClient(_containerName);
        await container.CreateIfNotExistsAsync(PublicAccessType.None, cancellationToken: ct);
        return container;
    }

    public async Task<ArtifactInfo> UploadAsync(string projectId, string fileName, string contentType, Stream content, string? category, CancellationToken ct)
    {
        var container = await GetContainerAsync(ct);
        var id = Guid.NewGuid().ToString("n");
        var blobName = $"{projectId}/{id}-{fileName}";
        var blob = container.GetBlobClient(blobName);
        var headers = new BlobHttpHeaders { ContentType = contentType };
        var options = new BlobUploadOptions {
            HttpHeaders = headers,
            Metadata = new Dictionary<string,string>()
        };
        if (!string.IsNullOrWhiteSpace(category)) options.Metadata["category"] = category!;
        await blob.UploadAsync(content, options, ct);
        var props = await blob.GetPropertiesAsync(cancellationToken: ct);
        var cat = props.Value.Metadata != null && props.Value.Metadata.TryGetValue("category", out var c) ? c : null;
        var info = new ArtifactInfo(id, fileName, contentType, props.Value.ContentLength, DateTimeOffset.UtcNow, blob.Uri.ToString(), cat);
        return info;
    }

    public async Task<(Stream Stream, ArtifactInfo Info)> DownloadAsync(string projectId, string artifactId, CancellationToken ct)
    {
        var container = await GetContainerAsync(ct);
        await foreach (var item in container.GetBlobsAsync(prefix: $"{projectId}/", cancellationToken: ct))
        {
            // filename format: {projectId}/{id}-{fileName}
            var nameOnly = item.Name.Substring(item.Name.LastIndexOf('/')+1);
            if (nameOnly.StartsWith(artifactId + "-", StringComparison.OrdinalIgnoreCase))
            {
                var fileName = nameOnly[(artifactId.Length+1)..];
                var blob = container.GetBlobClient(item.Name);
                var dl = await blob.DownloadStreamingAsync(cancellationToken: ct);
                var cat = dl.Value.Details.Metadata != null && dl.Value.Details.Metadata.TryGetValue("category", out var c) ? c : null;
                var info = new ArtifactInfo(artifactId, fileName, dl.Value.Details.ContentType ?? "application/octet-stream", dl.Value.Details.ContentLength, item.Properties.CreatedOn ?? DateTimeOffset.UtcNow, blob.Uri.ToString(), cat);
                return (dl.Value.Content, info);
            }
        }
        throw new FileNotFoundException("Artifact not found");
    }

    public async IAsyncEnumerable<ArtifactInfo> ListAsync(string projectId, [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct)
    {
        var container = await GetContainerAsync(ct);
        await foreach (var item in container.GetBlobsAsync(traits: BlobTraits.Metadata, states: BlobStates.None, prefix: $"{projectId}/", cancellationToken: ct))
        {
            var nameOnly = item.Name.Substring(item.Name.LastIndexOf('/')+1);
            var dash = nameOnly.IndexOf('-');
            if (dash <= 0) continue;
            var id = nameOnly.Substring(0, dash);
            var fileName = nameOnly[(dash+1)..];
            var ctType = item.Properties.ContentType ?? "application/octet-stream";
            var size = item.Properties.ContentLength ?? 0L;
            var created = item.Properties.CreatedOn ?? DateTimeOffset.UtcNow;
            var blobClient = container.GetBlobClient(item.Name);
            var cat = item.Metadata != null && item.Metadata.TryGetValue("category", out var c) ? c : null;
            yield return new ArtifactInfo(id, fileName, ctType, size, created, blobClient.Uri.ToString(), cat);
        }
    }
}
