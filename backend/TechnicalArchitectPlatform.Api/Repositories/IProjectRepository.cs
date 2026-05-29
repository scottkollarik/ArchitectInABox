using TechnicalArchitectPlatform.Api.Models;

namespace TechnicalArchitectPlatform.Api.Repositories;

public interface IProjectRepository
{
    Task<IEnumerable<ProjectResponse>> GetProjectsByUserAsync(string scope, string userId, CancellationToken ct = default);
    Task<ProjectResponse?> GetProjectByIdAsync(string id, CancellationToken ct = default);
    Task<ProjectResponse> UpsertProjectAsync(ProjectDocument project, CancellationToken ct = default);
    Task<bool> DeleteProjectAsync(string id, CancellationToken ct = default);
    Task<bool> HasReadAccessAsync(string projectId, string scope, string userId, CancellationToken ct = default);
    Task<bool> HasWriteAccessAsync(string projectId, string scope, string userId, CancellationToken ct = default);
    Task<bool> HasOwnerAccessAsync(string projectId, string scope, string userId, CancellationToken ct = default);

    // Sharing operations
    Task<List<ProjectCollaborator>?> GetCollaboratorsAsync(string projectId, CancellationToken ct = default);
    Task<List<ProjectCollaborator>?> AddOrUpdateCollaboratorAsync(string projectId, ProjectCollaboratorDocument collaborator, CancellationToken ct = default);
    Task<bool> RemoveCollaboratorAsync(string projectId, string principalId, CancellationToken ct = default);
}
