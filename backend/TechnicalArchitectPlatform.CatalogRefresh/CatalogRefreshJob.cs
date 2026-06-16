using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using TechnicalArchitectPlatform.Api.Models;
using TechnicalArchitectPlatform.CatalogRefresh.Models;

namespace TechnicalArchitectPlatform.CatalogRefresh;

/// <summary>
/// Refreshes the azureServiceCatalog MongoDB collection.
/// Pulls live pricing data from the Azure Retail Prices API, then asks
/// Claude to update descriptions and pricing, fill gaps, and mark deprecated services.
/// </summary>
internal sealed class CatalogRefreshJob
{
    private const string CollectionName = "azureServiceCatalog";
    private const int ClaudeMaxTokens = 8192;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = false
    };

    private readonly IMongoCollection<AzureServiceDocument> _collection;
    private readonly ClaudeClient _claude;
    private readonly AzurePricingClient _pricingClient;
    private readonly ILogger<CatalogRefreshJob> _logger;

    public CatalogRefreshJob(
        IMongoDatabase database,
        ClaudeClient claude,
        AzurePricingClient pricingClient,
        ILogger<CatalogRefreshJob> logger)
    {
        _collection = database.GetCollection<AzureServiceDocument>(CollectionName);
        _claude = claude;
        _pricingClient = pricingClient;
        _logger = logger;
    }

    /// <summary>
    /// Runs the catalog refresh and returns the number of services upserted.
    /// </summary>
    public async Task<int> RunAsync(CancellationToken cancellationToken = default)
    {
        var existing = await LoadExistingServicesAsync(cancellationToken);
        _logger.LogInformation("Loaded {Count} existing services from MongoDB", existing.Count);

        var pricingData = await FetchRepresentativePricingAsync(cancellationToken);
        _logger.LogInformation("Fetched pricing data for {Count} services", pricingData.Count);

        var prompt = BuildCatalogPrompt(existing, pricingData);
        _logger.LogInformation("Sending catalog refresh prompt to Claude...");

        var claudeResponse = await _claude.CompleteAsync(prompt, ClaudeMaxTokens);

        var updatedServices = ParseServiceDocuments(claudeResponse);
        _logger.LogInformation("Claude returned {Count} service documents", updatedServices.Count);

        var upsertCount = await UpsertServicesAsync(updatedServices, cancellationToken);
        return upsertCount;
    }

    private async Task<List<AzureServiceDocument>> LoadExistingServicesAsync(CancellationToken ct)
    {
        var existing = await _collection.Find(FilterDefinition<AzureServiceDocument>.Empty)
            .ToListAsync(ct);

        if (existing.Count == 0)
        {
            _logger.LogInformation("Collection empty — seeding with {Count} baseline services",
                SeedData.BaselineServices.Count);
            return SeedData.BaselineServices.ToList();
        }

        return existing;
    }

    private async Task<Dictionary<string, List<AzurePriceItem>>> FetchRepresentativePricingAsync(
        CancellationToken ct)
    {
        var result = new Dictionary<string, List<AzurePriceItem>>();

        foreach (var serviceName in AzurePricingClient.RepresentativeServiceNames)
        {
            ct.ThrowIfCancellationRequested();
            try
            {
                var prices = await _pricingClient.GetPricesAsync(serviceName);
                if (prices.Count > 0)
                    result[serviceName] = prices.Take(5).ToList(); // top 5 SKUs per service
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Skipping pricing fetch for {ServiceName} due to error", serviceName);
            }

            // Rate-limit: don't hammer the pricing API
            await Task.Delay(TimeSpan.FromMilliseconds(250), ct);
        }

        return result;
    }

    private static string BuildCatalogPrompt(
        List<AzureServiceDocument> existing,
        Dictionary<string, List<AzurePriceItem>> pricingData)
    {
        // Summarise existing services as compact JSON (id, name, category, description, pricing.estimate)
        var existingSummary = existing.Select(s => new
        {
            id = s.Id,
            name = s.Name,
            category = s.Category,
            tier = s.Tier,
            description = s.Description,
            pricing_estimate = s.Pricing?.Estimate
        });

        var existingJson = JsonSerializer.Serialize(existingSummary, JsonOptions);

        // Format pricing snapshot
        var pricingLines = pricingData
            .SelectMany(kvp => kvp.Value.Select(p =>
                $"  {kvp.Key} / {p.SkuName}: ${p.RetailPrice:F4}/{p.UnitOfMeasure}"))
            .Take(80); // keep prompt bounded
        var pricingSection = string.Join("\n", pricingLines);

        // Use $$""" (double-dollar raw string) so {{ is a literal brace in the schema example
        // and {{variable}} is the interpolation syntax.
        return $$"""
You are an Azure architecture expert maintaining a service catalog for a cloud architecture advisor tool.

## Current service catalog (abbreviated)
{{existingJson}}

## Fresh pricing data from Azure Retail Prices API (eastus, USD)
{{pricingSection}}

## Your task
Return an updated, complete JSON array of Azure service catalog entries.

Rules:
1. Use the existing services as a base. Update pricing.estimate based on the fresh data where available.
2. Update descriptions if an Azure service has meaningfully changed (e.g., renamed, new capabilities).
3. Add any major Azure GA services that are missing from the current catalog and are relevant to cloud architecture decisions. Focus on services architects commonly choose between: compute, database, storage, networking, integration, security, identity, monitoring, and AI/ML.
4. Set isDeprecated=true for any service that has been deprecated or retired by Microsoft.
5. Do not remove existing entries — mark them deprecated instead.
6. For each service, populate ALL fields in the schema.

## Schema for each object
{
  "id": "kebab-case-unique-id",
  "name": "Display Name",
  "category": "Category",
  "tier": "IaaS | PaaS | SaaS",
  "description": "One-sentence description",
  "longDescription": "2-3 sentence detailed description",
  "requiredDependencies": ["service-id", "..."],
  "optionalDependencies": ["service-id", "..."],
  "conflictsWith": [],
  "nfrRequirements": ["high-availability", "..."],
  "architectureRole": "core | supporting | optional",
  "pricing": { "tier": "...", "estimate": "~$X/month at typical scale", "unit": "...", "calculator": "https://..." },
  "tags": ["tag1", "..."],
  "documentation": "https://learn.microsoft.com/...",
  "availablePublic": true,
  "availableGov": false,
  "isDeprecated": false,
  "refreshedAt": "2024-01-01T00:00:00Z"
}

CRITICAL: Return ONLY a valid JSON array. No markdown, no explanation, no code fences. Start with [ and end with ].
""";
    }

    private List<AzureServiceDocument> ParseServiceDocuments(string claudeResponse)
    {
        var json = ExtractJsonArray(claudeResponse);

        try
        {
            var docs = JsonSerializer.Deserialize<List<AzureServiceDocument>>(json, JsonOptions);
            if (docs is null || docs.Count == 0)
                throw new InvalidOperationException("Claude returned an empty service list.");
            return docs;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse Claude's catalog response. Raw response (first 500 chars): {Preview}",
                claudeResponse.Length > 500 ? claudeResponse[..500] : claudeResponse);
            throw;
        }
    }

    private static string ExtractJsonArray(string text)
    {
        var start = text.IndexOf('[');
        var end = text.LastIndexOf(']');
        if (start < 0 || end < 0 || end <= start)
            throw new InvalidOperationException("Claude response does not contain a JSON array.");
        return text[start..(end + 1)];
    }

    private async Task<int> UpsertServicesAsync(
        List<AzureServiceDocument> services,
        CancellationToken ct)
    {
        var upsertCount = 0;

        foreach (var service in services)
        {
            ct.ThrowIfCancellationRequested();

            service.RefreshedAt = DateTime.UtcNow;

            var filter = Builders<AzureServiceDocument>.Filter.Eq(s => s.Id, service.Id);
            var options = new ReplaceOptions { IsUpsert = true };

            var result = await _collection.ReplaceOneAsync(filter, service, options, ct);

            if (result.IsAcknowledged)
                upsertCount++;
        }

        _logger.LogInformation("Upserted {Count} services to {Collection}", upsertCount, CollectionName);
        return upsertCount;
    }
}
