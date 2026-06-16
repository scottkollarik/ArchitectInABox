using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using TechnicalArchitectPlatform.CatalogRefresh.Models;

namespace TechnicalArchitectPlatform.CatalogRefresh;

/// <summary>
/// Minimal HttpClient wrapper for the Anthropic Messages API.
/// Uses no external SDK — only HttpClient + System.Text.Json.
/// </summary>
internal sealed class ClaudeClient
{
    private const string ApiEndpoint = "https://api.anthropic.com/v1/messages";
    private const string AnthropicVersion = "2023-06-01";
    private const string DefaultModel = "claude-haiku-4-5-20251001";

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly HttpClient _httpClient;
    private readonly ILogger<ClaudeClient> _logger;

    public ClaudeClient(string apiKey, ILogger<ClaudeClient> logger)
    {
        _logger = logger;

        _httpClient = new HttpClient();
        _httpClient.DefaultRequestHeaders.Add("x-api-key", apiKey);
        _httpClient.DefaultRequestHeaders.Add("anthropic-version", AnthropicVersion);
        _httpClient.DefaultRequestHeaders.Accept.Add(
            new MediaTypeWithQualityHeaderValue("application/json"));
    }

    /// <summary>
    /// Sends a single-turn prompt to Claude and returns the text of the first content block.
    /// </summary>
    /// <param name="prompt">The user prompt text.</param>
    /// <param name="maxTokens">Maximum output tokens (default 8192).</param>
    /// <returns>The text content from the first content block in the response.</returns>
    public async Task<string> CompleteAsync(string prompt, int maxTokens = 8192)
    {
        var request = new ClaudeRequest(
            Model: DefaultModel,
            MaxTokens: maxTokens,
            Messages: [new ClaudeMessage("user", prompt)]
        );

        var json = JsonSerializer.Serialize(request, SerializerOptions);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        _logger.LogDebug("Sending request to Claude ({Model}), max_tokens={MaxTokens}",
            DefaultModel, maxTokens);

        using var response = await _httpClient.PostAsync(ApiEndpoint, content);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            _logger.LogError("Claude API returned {StatusCode}: {Body}",
                response.StatusCode, errorBody);
            throw new HttpRequestException(
                $"Claude API error {(int)response.StatusCode}: {errorBody}");
        }

        var responseJson = await response.Content.ReadAsStringAsync();

        var claudeResponse = JsonSerializer.Deserialize<ClaudeResponse>(
            responseJson, SerializerOptions)
            ?? throw new InvalidOperationException("Claude API returned null response body.");

        if (claudeResponse.Content.Length == 0)
            throw new InvalidOperationException("Claude API returned a response with no content blocks.");

        return claudeResponse.Content[0].Text;
    }
}
