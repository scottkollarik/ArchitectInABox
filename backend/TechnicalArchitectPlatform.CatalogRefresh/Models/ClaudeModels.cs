namespace TechnicalArchitectPlatform.CatalogRefresh.Models;

// Internal models for the Anthropic Messages API request/response.
// We avoid using any external SDK; all serialization is via System.Text.Json.

internal sealed record ClaudeRequest(
    string Model,
    int MaxTokens,
    ClaudeMessage[] Messages
);

internal sealed record ClaudeMessage(string Role, string Content);

internal sealed record ClaudeResponse(ClaudeContentBlock[] Content);

internal sealed record ClaudeContentBlock(string Type, string Text);
