using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using TechnicalArchitectPlatform.Api.Models;

namespace TechnicalArchitectPlatform.CatalogRefresh;

/// <summary>
/// Generates NFR → service recommendation rules and replaces the nfrRecommendations collection.
/// Uses the current azureServiceCatalog as context so rule service IDs stay in sync.
/// </summary>
internal sealed class NfrRecommendationJob
{
    private const string ServicesCollectionName = "azureServiceCatalog";
    private const string RulesCollectionName = "nfrRecommendations";
    private const int ClaudeMaxTokens = 8192;
    private const int TargetRuleCount = 50;

    // These must stay in sync with the frontend NFR question IDs.
    private static readonly IReadOnlyList<string> NfrQuestionIds =
    [
        "expected-rps",
        "traffic-pattern",
        "serverless-acceptable",
        "request-types",
        "data-model",
        "consistency-level",
        "read-write-ratio",
        "multi-region",
        "data-growth",
        "item-size",
        "search-analytics",
        "secrets-management",
        "key-management",
        "encryption-reqs",
        "geo-distribution",
        "latency-targets",
        "security-compliance",
        "network-posture",
        "compliance-reqs",
        "identity-provider",
        "monitoring-stack",
        "log-retention",
        "platform-preference",
        "zone-redundancy",
        "data-consistency"
    ];

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = false
    };

    private readonly IMongoCollection<AzureServiceDocument> _servicesCollection;
    private readonly IMongoCollection<NfrRecommendationRuleDocument> _rulesCollection;
    private readonly ClaudeClient _claude;
    private readonly ILogger<NfrRecommendationJob> _logger;

    public NfrRecommendationJob(
        IMongoDatabase database,
        ClaudeClient claude,
        ILogger<NfrRecommendationJob> logger)
    {
        _servicesCollection = database.GetCollection<AzureServiceDocument>(ServicesCollectionName);
        _rulesCollection = database.GetCollection<NfrRecommendationRuleDocument>(RulesCollectionName);
        _claude = claude;
        _logger = logger;
    }

    /// <summary>
    /// Generates fresh recommendation rules and replaces the collection.
    /// Returns the number of rules inserted.
    /// </summary>
    public async Task<int> RunAsync(CancellationToken cancellationToken = default)
    {
        var services = await LoadServicesAsync(cancellationToken);
        _logger.LogInformation("Loaded {Count} services for NFR rule generation", services.Count);

        var prompt = BuildNfrPrompt(services);
        _logger.LogInformation("Sending NFR recommendation prompt to Claude...");

        var claudeResponse = await _claude.CompleteAsync(prompt, ClaudeMaxTokens);

        var rules = ParseRuleDocuments(claudeResponse);
        _logger.LogInformation("Claude returned {Count} recommendation rules", rules.Count);

        var insertCount = await ReplaceAllRulesAsync(rules, cancellationToken);
        return insertCount;
    }

    private async Task<List<AzureServiceDocument>> LoadServicesAsync(CancellationToken ct)
    {
        return await _servicesCollection
            .Find(Builders<AzureServiceDocument>.Filter.Eq(s => s.IsDeprecated, false))
            .ToListAsync(ct);
    }

    private static string BuildNfrPrompt(List<AzureServiceDocument> services)
    {
        var serviceIndex = services.Select(s => new
        {
            id = s.Id,
            name = s.Name,
            category = s.Category,
            tags = s.Tags,
            nfrRequirements = s.NfrRequirements
        });

        var serviceJson = JsonSerializer.Serialize(serviceIndex, JsonOptions);
        var questionList = string.Join(", ", NfrQuestionIds);

        // Use $$""" (double-dollar raw string) so {{ is a literal brace in the schema example
        // and {{variable}} is the interpolation syntax.
        return $$"""
You are an Azure cloud architect expert generating recommendation rules for a cloud architecture advisor tool.
The tool asks users a set of Non-Functional Requirements (NFR) questions, then recommends Azure services based on their answers.

## Available Azure services
{{serviceJson}}

## NFR question IDs (these are the exact question IDs used in the frontend)
{{questionList}}

## Your task
Generate {{TargetRuleCount}} recommendation rules that map NFR signal combinations to recommended or discouraged Azure services.

Guidelines:
- Each rule targets ONE nfrQuestionId and describes a specific condition/answer for that question.
- Rules should be actionable: they must list at least 1 recommendedServiceId or 1 discouragedServiceId.
- Use only service IDs from the provided service list.
- Cover the most architecturally significant NFR signals. Focus on signals that meaningfully differentiate service choices.
- Distribute rules across multiple question IDs — don't cluster all rules on one question.
- Priority: 1 = highest importance, 10 = lowest. Assign based on how critical this signal is.
- Rationale should be concise (1-2 sentences) explaining WHY this rule applies.

Examples of good rules:
- nfrQuestionId="expected-rps", condition="> 10,000 req/s", recommended=["azure-front-door","azure-container-apps"], discouraged=["azure-app-service"], rationale="At high RPS, CDN-layer routing and horizontal pod autoscaling outperform single-plan App Service."
- nfrQuestionId="data-model", condition="Document/JSON data with variable schema", recommended=["azure-cosmos-db"], discouraged=["azure-sql-database"], rationale="Schema-less document storage avoids costly migrations for evolving JSON structures."

## Output schema for each rule
{
  "id": "unique-kebab-case-id",
  "nfrQuestionId": "one-of-the-question-ids-above",
  "condition": "Human-readable description of the answer/condition that triggers this rule",
  "recommendedServiceIds": ["service-id", "..."],
  "discouragedServiceIds": ["service-id", "..."],
  "rationale": "Why this rule applies",
  "priority": 1,
  "refreshedAt": "2024-01-01T00:00:00Z"
}

CRITICAL: Return ONLY a valid JSON array of rule objects. No markdown, no explanation, no code fences. Start with [ and end with ].
""";
    }

    private List<NfrRecommendationRuleDocument> ParseRuleDocuments(string claudeResponse)
    {
        var json = ExtractJsonArray(claudeResponse);

        try
        {
            var rules = JsonSerializer.Deserialize<List<NfrRecommendationRuleDocument>>(json, JsonOptions);
            if (rules is null || rules.Count == 0)
                throw new InvalidOperationException("Claude returned an empty rules list.");
            return rules;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex,
                "Failed to parse Claude's NFR rules response. Raw response (first 500 chars): {Preview}",
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

    private async Task<int> ReplaceAllRulesAsync(
        List<NfrRecommendationRuleDocument> rules,
        CancellationToken ct)
    {
        // Full replace: delete all existing AI-generated rules, then insert fresh set.
        // Rules are 100% derived — no user-created data to preserve.
        await _rulesCollection.DeleteManyAsync(
            FilterDefinition<NfrRecommendationRuleDocument>.Empty,
            ct);

        _logger.LogDebug("Deleted existing recommendation rules");

        if (rules.Count == 0)
        {
            _logger.LogWarning("No rules to insert after delete — collection left empty");
            return 0;
        }

        var now = DateTime.UtcNow;
        foreach (var rule in rules)
            rule.RefreshedAt = now;

        await _rulesCollection.InsertManyAsync(rules, cancellationToken: ct);

        _logger.LogInformation("Inserted {Count} recommendation rules into {Collection}",
            rules.Count, RulesCollectionName);
        return rules.Count;
    }
}
