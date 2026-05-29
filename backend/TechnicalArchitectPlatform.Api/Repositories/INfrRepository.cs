using TechnicalArchitectPlatform.Api.Models;

namespace TechnicalArchitectPlatform.Api.Repositories;

public interface INfrRepository
{
    Task<NfrAssessmentResponse?> GetByProjectIdAsync(string projectId, CancellationToken ct = default);
    Task<NfrAssessmentResponse> UpsertAsync(NfrAssessmentDocument document, CancellationToken ct = default);
    Task<bool> DeleteByProjectIdAsync(string projectId, CancellationToken ct = default);
}
