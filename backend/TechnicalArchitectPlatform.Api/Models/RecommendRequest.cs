namespace TechnicalArchitectPlatform.Api.Models;

/// <summary>
/// Request body for POST /api/architecture/recommend
/// </summary>
public class RecommendRequest
{
    /// <summary>
    /// Map of NFR question IDs to the user's answer for that question.
    /// Only questions that appear as keys here are matched against recommendation rules.
    /// </summary>
    public Dictionary<string, object?>? NfrAnswers { get; init; }

    /// <summary>
    /// High-level project profile used for contextual filtering (not yet applied —
    /// reserved for future rule enrichment).
    /// </summary>
    public ProjectProfile? ProjectProfile { get; init; }
}

/// <summary>
/// Coarse project profile supplied alongside NFR answers.
/// </summary>
public record ProjectProfile(string? Level, string? Size);
