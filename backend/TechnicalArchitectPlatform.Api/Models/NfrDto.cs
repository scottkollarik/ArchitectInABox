namespace TechnicalArchitectPlatform.Api.Models;

public record NfrAssessmentDto(
    string Id,
    string ProjectId,
    object Sections, // shape mirrors frontend NFR sections/questions
    object CompletionStatus,
    int SchemaVersion,
    DateTime CreatedAt,
    DateTime LastModified
);

