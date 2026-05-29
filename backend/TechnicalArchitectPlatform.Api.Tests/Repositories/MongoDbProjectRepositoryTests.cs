using FluentAssertions;
using MongoDB.Driver;
using Moq;
using TechnicalArchitectPlatform.Api.Models;
using TechnicalArchitectPlatform.Api.Repositories;

namespace TechnicalArchitectPlatform.Api.Tests.Repositories;

/// <summary>
/// Unit tests for MongoDbProjectRepository.
///
/// MOCKING STRATEGY
/// ----------------
/// IMongoCollectionExtensions.Find is an extension method and cannot be stubbed
/// with Moq directly. The extension calls FindSync on the underlying interface.
/// FindSync returns an IAsyncCursor. The driver's FirstOrDefaultAsync and
/// ToListAsync use TWO different cursor execution paths:
///
///   - ToListAsync   calls MoveNextAsync (async path)
///   - FirstOrDefaultAsync calls GetFirstBatchAsync which calls MoveNext (sync path)
///
/// Therefore the cursor mock must stub BOTH MoveNext (sync) and MoveNextAsync
/// and return the document list from Current in both cases.
///
/// NOTE: Tests that verify the CONTENT of the filter expression (e.g., the OR
/// clause in BuildAccessFilter) require a live MongoDB LINQ provider and belong
/// in integration tests.
/// </summary>
public class MongoDbProjectRepositoryTests
{
    // ---------------------------------------------------------------------------
    // Test-data builders
    // ---------------------------------------------------------------------------

    private static ProjectDocument BuildProject(
        string id = "proj-1",
        string ownerScope = "user",
        string ownerId = "user-abc",
        List<ProjectCollaboratorDocument>? collaborators = null) => new()
    {
        Id = id,
        OwnerScope = ownerScope,
        OwnerId = ownerId,
        Name = "Test Project",
        Description = "A test project",
        SchemaVersion = 1,
        CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
        LastModified = new DateTime(2024, 6, 1, 0, 0, 0, DateTimeKind.Utc),
        Collaborators = collaborators ?? new List<ProjectCollaboratorDocument>()
    };

    private static ProjectCollaboratorDocument BuildCollaborator(
        string principalId = "collab-1",
        string principalType = "user",
        string role = "reader") => new()
    {
        PrincipalId = principalId,
        PrincipalType = principalType,
        Role = role,
        AddedAt = DateTime.UtcNow
    };

    /// <summary>
    /// Builds a cursor mock whose sync and async MoveNext paths both return the
    /// given items exactly once before signalling exhaustion.
    /// </summary>
    private static IAsyncCursor<ProjectDocument> BuildCursor(
        IReadOnlyList<ProjectDocument> items)
    {
        var cursor = new Mock<IAsyncCursor<ProjectDocument>>();

        // Sync path — used by FirstOrDefaultAsync via GetFirstBatchAsync
        cursor.SetupSequence(c => c.MoveNext(It.IsAny<CancellationToken>()))
              .Returns(items.Count > 0)
              .Returns(false);

        // Async path — used by ToListAsync
        cursor.SetupSequence(c => c.MoveNextAsync(It.IsAny<CancellationToken>()))
              .ReturnsAsync(items.Count > 0)
              .ReturnsAsync(false);

        // Current must always return a non-null enumerable
        cursor.Setup(c => c.Current).Returns(items);

        return cursor.Object;
    }

    private static (MongoDbProjectRepository repo, Mock<IMongoCollection<ProjectDocument>> collectionMock)
        BuildSut(IEnumerable<ProjectDocument> collectionContents)
    {
        var items = collectionContents.ToList();
        var cursor = BuildCursor(items);

        var collectionMock = new Mock<IMongoCollection<ProjectDocument>>();
        collectionMock
            .Setup(c => c.FindAsync(
                It.IsAny<FilterDefinition<ProjectDocument>>(),
                It.IsAny<FindOptions<ProjectDocument, ProjectDocument>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(cursor);

        var dbMock = new Mock<IMongoDatabase>();
        dbMock
            .Setup(d => d.GetCollection<ProjectDocument>(
                It.IsAny<string>(),
                It.IsAny<MongoCollectionSettings>()))
            .Returns(collectionMock.Object);

        var clientMock = new Mock<IMongoClient>();
        clientMock
            .Setup(c => c.GetDatabase(It.IsAny<string>(), It.IsAny<MongoDatabaseSettings>()))
            .Returns(dbMock.Object);

        return (new MongoDbProjectRepository(clientMock.Object), collectionMock);
    }

    // ---------------------------------------------------------------------------
    // GetProjectsByUserAsync
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task GetProjectsByUserAsync_ReturnsProjectsMappedToResponse()
    {
        // Arrange
        var project = BuildProject(id: "p1", ownerId: "user-abc");
        var (repo, _) = BuildSut(new[] { project });

        // Act
        var result = await repo.GetProjectsByUserAsync("user", "user-abc");

        // Assert
        result.Should().ContainSingle(r => r.Id == "p1" && r.OwnerId == "user-abc");
    }

    [Fact]
    public async Task GetProjectsByUserAsync_ReturnsEmptyWhenNoProjectsFound()
    {
        // Arrange
        var (repo, _) = BuildSut(Array.Empty<ProjectDocument>());

        // Act
        var result = await repo.GetProjectsByUserAsync("user", "user-xyz");

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetProjectsByUserAsync_MapsBothOwnerFieldsCorrectly()
    {
        // Arrange
        var project = BuildProject(id: "p2", ownerScope: "org", ownerId: "org-99");
        var (repo, _) = BuildSut(new[] { project });

        // Act
        var result = (await repo.GetProjectsByUserAsync("org", "org-99")).ToList();

        // Assert
        result.Should().ContainSingle();
        result[0].OwnerScope.Should().Be("org");
        result[0].OwnerId.Should().Be("org-99");
    }

    // ---------------------------------------------------------------------------
    // GetProjectByIdAsync
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task GetProjectByIdAsync_ReturnsResponseWhenProjectExists()
    {
        // Arrange
        var project = BuildProject(id: "proj-42");
        var (repo, _) = BuildSut(new[] { project });

        // Act
        var result = await repo.GetProjectByIdAsync("proj-42");

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be("proj-42");
        result.Name.Should().Be("Test Project");
    }

    [Fact]
    public async Task GetProjectByIdAsync_ReturnsNullWhenProjectDoesNotExist()
    {
        // Arrange
        var (repo, _) = BuildSut(Array.Empty<ProjectDocument>());

        // Act
        var result = await repo.GetProjectByIdAsync("nonexistent");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetProjectByIdAsync_MapsDateFieldsFromDocument()
    {
        // Arrange
        var createdAt = new DateTime(2023, 3, 15, 12, 0, 0, DateTimeKind.Utc);
        var lastModified = new DateTime(2024, 1, 20, 9, 0, 0, DateTimeKind.Utc);
        var project = BuildProject(id: "date-proj");
        project.CreatedAt = createdAt;
        project.LastModified = lastModified;
        var (repo, _) = BuildSut(new[] { project });

        // Act
        var result = await repo.GetProjectByIdAsync("date-proj");

        // Assert
        result!.CreatedAt.Should().Be(createdAt);
        result.LastModified.Should().Be(lastModified);
    }

    // ---------------------------------------------------------------------------
    // UpsertProjectAsync
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task UpsertProjectAsync_ReturnsResponseForUpsertedDocument()
    {
        // Arrange
        var project = BuildProject(id: "upsert-1", ownerId: "user-abc");
        var (repo, collectionMock) = BuildSut(Array.Empty<ProjectDocument>());
        collectionMock
            .Setup(c => c.ReplaceOneAsync(
                It.IsAny<FilterDefinition<ProjectDocument>>(),
                project,
                It.IsAny<ReplaceOptions>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ReplaceOneResult.Acknowledged(1, 1, null));

        // Act
        var result = await repo.UpsertProjectAsync(project);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be("upsert-1");
        result.OwnerId.Should().Be("user-abc");
    }

    [Fact]
    public async Task UpsertProjectAsync_CallsReplaceOneWithUpsertTrue()
    {
        // Arrange
        var project = BuildProject(id: "upsert-verify");
        var (repo, collectionMock) = BuildSut(Array.Empty<ProjectDocument>());

        ReplaceOptions? capturedOptions = null;
        collectionMock
            .Setup(c => c.ReplaceOneAsync(
                It.IsAny<FilterDefinition<ProjectDocument>>(),
                project,
                It.IsAny<ReplaceOptions>(),
                It.IsAny<CancellationToken>()))
            .Callback<FilterDefinition<ProjectDocument>, ProjectDocument, ReplaceOptions, CancellationToken>(
                (_, _, opts, _) => capturedOptions = opts)
            .ReturnsAsync(new ReplaceOneResult.Acknowledged(1, 1, null));

        // Act
        await repo.UpsertProjectAsync(project);

        // Assert
        capturedOptions.Should().NotBeNull();
        capturedOptions!.IsUpsert.Should().BeTrue();
    }

    [Fact]
    public async Task UpsertProjectAsync_MapsAllScalarFieldsToResponse()
    {
        // Arrange
        var project = BuildProject(id: "full-upsert", ownerScope: "org", ownerId: "org-7");
        project.Description = "Detailed description";
        project.SchemaVersion = 3;
        var (repo, collectionMock) = BuildSut(Array.Empty<ProjectDocument>());
        collectionMock
            .Setup(c => c.ReplaceOneAsync(
                It.IsAny<FilterDefinition<ProjectDocument>>(),
                project,
                It.IsAny<ReplaceOptions>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ReplaceOneResult.Acknowledged(1, 1, null));

        // Act
        var result = await repo.UpsertProjectAsync(project);

        // Assert
        result.OwnerScope.Should().Be("org");
        result.OwnerId.Should().Be("org-7");
        result.Description.Should().Be("Detailed description");
        result.SchemaVersion.Should().Be(3);
    }

    // ---------------------------------------------------------------------------
    // DeleteProjectAsync
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task DeleteProjectAsync_ReturnsTrueWhenDocumentWasDeleted()
    {
        // Arrange
        var (repo, collectionMock) = BuildSut(Array.Empty<ProjectDocument>());
        collectionMock
            .Setup(c => c.DeleteOneAsync(
                It.IsAny<FilterDefinition<ProjectDocument>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DeleteResult.Acknowledged(1));

        // Act
        var result = await repo.DeleteProjectAsync("proj-del");

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task DeleteProjectAsync_ReturnsFalseWhenNoDocumentWasDeleted()
    {
        // Arrange
        var (repo, collectionMock) = BuildSut(Array.Empty<ProjectDocument>());
        collectionMock
            .Setup(c => c.DeleteOneAsync(
                It.IsAny<FilterDefinition<ProjectDocument>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DeleteResult.Acknowledged(0));

        // Act
        var result = await repo.DeleteProjectAsync("nonexistent-proj");

        // Assert
        result.Should().BeFalse();
    }

    // ---------------------------------------------------------------------------
    // HasReadAccessAsync
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task HasReadAccessAsync_ReturnsTrueForProjectOwner()
    {
        // Arrange
        var project = BuildProject(id: "access-proj", ownerScope: "user", ownerId: "owner-1");
        var (repo, _) = BuildSut(new[] { project });

        // Act
        var result = await repo.HasReadAccessAsync("access-proj", "user", "owner-1");

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task HasReadAccessAsync_ReturnsTrueForReaderCollaborator()
    {
        // Arrange
        var collab = BuildCollaborator(principalId: "collab-reader", principalType: "user", role: "reader");
        var project = BuildProject(id: "shared-proj",
            collaborators: new List<ProjectCollaboratorDocument> { collab });
        var (repo, _) = BuildSut(new[] { project });

        // Act
        var result = await repo.HasReadAccessAsync("shared-proj", "user", "collab-reader");

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task HasReadAccessAsync_ReturnsFalseForUnrelatedUser()
    {
        // Arrange
        var project = BuildProject(id: "private-proj", ownerId: "owner-1");
        var (repo, _) = BuildSut(new[] { project });

        // Act
        var result = await repo.HasReadAccessAsync("private-proj", "user", "stranger-99");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task HasReadAccessAsync_ReturnsFalseWhenProjectDoesNotExist()
    {
        // Arrange
        var (repo, _) = BuildSut(Array.Empty<ProjectDocument>());

        // Act
        var result = await repo.HasReadAccessAsync("ghost-proj", "user", "any-user");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task HasReadAccessAsync_ReturnsFalseWhenScopeDoesNotMatch()
    {
        // Arrange — document owner is in "org" scope; querying as "user" scope is denied
        var project = BuildProject(id: "org-proj", ownerScope: "org", ownerId: "org-1");
        var (repo, _) = BuildSut(new[] { project });

        // Act
        var result = await repo.HasReadAccessAsync("org-proj", "user", "org-1");

        // Assert
        result.Should().BeFalse();
    }

    // ---------------------------------------------------------------------------
    // HasWriteAccessAsync
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task HasWriteAccessAsync_ReturnsTrueForProjectOwner()
    {
        // Arrange
        var project = BuildProject(id: "write-proj", ownerId: "owner-1");
        var (repo, _) = BuildSut(new[] { project });

        // Act
        var result = await repo.HasWriteAccessAsync("write-proj", "user", "owner-1");

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task HasWriteAccessAsync_ReturnsTrueForContributorCollaborator()
    {
        // Arrange
        var collab = BuildCollaborator(principalId: "contrib-1", role: "contributor");
        var project = BuildProject(id: "write-proj2",
            collaborators: new List<ProjectCollaboratorDocument> { collab });
        var (repo, _) = BuildSut(new[] { project });

        // Act
        var result = await repo.HasWriteAccessAsync("write-proj2", "user", "contrib-1");

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task HasWriteAccessAsync_ReturnsFalseForReaderCollaborator()
    {
        // Arrange — readers may read but not write
        var collab = BuildCollaborator(principalId: "reader-1", role: "reader");
        var project = BuildProject(id: "readonly-proj",
            collaborators: new List<ProjectCollaboratorDocument> { collab });
        var (repo, _) = BuildSut(new[] { project });

        // Act
        var result = await repo.HasWriteAccessAsync("readonly-proj", "user", "reader-1");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task HasWriteAccessAsync_ReturnsFalseForUnrelatedUser()
    {
        // Arrange
        var project = BuildProject(id: "write-proj3", ownerId: "owner-1");
        var (repo, _) = BuildSut(new[] { project });

        // Act
        var result = await repo.HasWriteAccessAsync("write-proj3", "user", "outsider");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task HasWriteAccessAsync_ReturnsFalseWhenProjectDoesNotExist()
    {
        // Arrange
        var (repo, _) = BuildSut(Array.Empty<ProjectDocument>());

        // Act
        var result = await repo.HasWriteAccessAsync("ghost", "user", "any-user");

        // Assert
        result.Should().BeFalse();
    }

    // ---------------------------------------------------------------------------
    // HasOwnerAccessAsync
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task HasOwnerAccessAsync_ReturnsTrueForOwnerWithMatchingScope()
    {
        // Arrange
        var project = BuildProject(id: "owner-proj", ownerScope: "user", ownerId: "owner-1");
        var (repo, _) = BuildSut(new[] { project });

        // Act
        var result = await repo.HasOwnerAccessAsync("owner-proj", "user", "owner-1");

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task HasOwnerAccessAsync_ReturnsFalseForCollaboratorEvenWithOwnerRole()
    {
        // Arrange — a collaborator with role "owner" is NOT the document owner
        var collab = BuildCollaborator(principalId: "pseudo-owner", role: "owner");
        var project = BuildProject(id: "owner-proj2", ownerId: "real-owner",
            collaborators: new List<ProjectCollaboratorDocument> { collab });
        var (repo, _) = BuildSut(new[] { project });

        // Act
        var result = await repo.HasOwnerAccessAsync("owner-proj2", "user", "pseudo-owner");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task HasOwnerAccessAsync_ReturnsFalseWhenProjectDoesNotExist()
    {
        // Arrange
        var (repo, _) = BuildSut(Array.Empty<ProjectDocument>());

        // Act
        var result = await repo.HasOwnerAccessAsync("ghost", "user", "owner-1");

        // Assert
        result.Should().BeFalse();
    }

    // ---------------------------------------------------------------------------
    // GetCollaboratorsAsync
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task GetCollaboratorsAsync_ReturnsCollaboratorListWhenProjectExists()
    {
        // Arrange
        var collab = BuildCollaborator(principalId: "collab-a", role: "reader");
        var project = BuildProject(id: "collab-proj",
            collaborators: new List<ProjectCollaboratorDocument> { collab });
        var (repo, _) = BuildSut(new[] { project });

        // Act
        var result = await repo.GetCollaboratorsAsync("collab-proj");

        // Assert
        result.Should().NotBeNull();
        result!.Should().ContainSingle(c => c.PrincipalId == "collab-a");
    }

    [Fact]
    public async Task GetCollaboratorsAsync_ReturnsNullWhenProjectDoesNotExist()
    {
        // Arrange
        var (repo, _) = BuildSut(Array.Empty<ProjectDocument>());

        // Act
        var result = await repo.GetCollaboratorsAsync("missing-proj");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetCollaboratorsAsync_ReturnsEmptyListWhenProjectHasNoCollaborators()
    {
        // Arrange
        var project = BuildProject(id: "solo-proj");
        var (repo, _) = BuildSut(new[] { project });

        // Act
        var result = await repo.GetCollaboratorsAsync("solo-proj");

        // Assert
        result.Should().NotBeNull();
        result!.Should().BeEmpty();
    }

    // ---------------------------------------------------------------------------
    // AddOrUpdateCollaboratorAsync
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task AddOrUpdateCollaboratorAsync_ReturnsNullWhenProjectDoesNotExist()
    {
        // Arrange
        var (repo, _) = BuildSut(Array.Empty<ProjectDocument>());
        var newCollab = BuildCollaborator(principalId: "new-user");

        // Act
        var result = await repo.AddOrUpdateCollaboratorAsync("missing-proj", newCollab);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task AddOrUpdateCollaboratorAsync_AddsCollaboratorAndReturnsUpdatedList()
    {
        // Arrange
        var project = BuildProject(id: "proj-share");
        var newCollab = BuildCollaborator(principalId: "new-user", role: "reader");
        var (repo, collectionMock) = BuildSut(new[] { project });
        collectionMock
            .Setup(c => c.ReplaceOneAsync(
                It.IsAny<FilterDefinition<ProjectDocument>>(),
                It.IsAny<ProjectDocument>(),
                It.IsAny<ReplaceOptions>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ReplaceOneResult.Acknowledged(1, 1, null));

        // Act
        var result = await repo.AddOrUpdateCollaboratorAsync("proj-share", newCollab);

        // Assert
        result.Should().NotBeNull();
        result!.Should().ContainSingle(c => c.PrincipalId == "new-user" && c.Role == "reader");
    }

    [Fact]
    public async Task AddOrUpdateCollaboratorAsync_ReplacesExistingCollaboratorWithSamePrincipal()
    {
        // Arrange — existing reader should be replaced by contributor for the same principal
        var existingCollab = BuildCollaborator(principalId: "user-x", principalType: "user", role: "reader");
        var project = BuildProject(id: "proj-update",
            collaborators: new List<ProjectCollaboratorDocument> { existingCollab });
        var updatedCollab = BuildCollaborator(principalId: "user-x", principalType: "user", role: "contributor");

        var (repo, collectionMock) = BuildSut(new[] { project });
        collectionMock
            .Setup(c => c.ReplaceOneAsync(
                It.IsAny<FilterDefinition<ProjectDocument>>(),
                It.IsAny<ProjectDocument>(),
                It.IsAny<ReplaceOptions>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ReplaceOneResult.Acknowledged(1, 1, null));

        // Act
        var result = await repo.AddOrUpdateCollaboratorAsync("proj-update", updatedCollab);

        // Assert — only one entry for user-x, with the updated role
        result.Should().NotBeNull();
        result!.Should().ContainSingle(c => c.PrincipalId == "user-x");
        result.Single(c => c.PrincipalId == "user-x").Role.Should().Be("contributor");
    }

    // ---------------------------------------------------------------------------
    // RemoveCollaboratorAsync
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task RemoveCollaboratorAsync_ReturnsFalseWhenProjectDoesNotExist()
    {
        // Arrange
        var (repo, _) = BuildSut(Array.Empty<ProjectDocument>());

        // Act
        var result = await repo.RemoveCollaboratorAsync("ghost-proj", "user-1");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task RemoveCollaboratorAsync_ReturnsFalseWhenCollaboratorNotOnProject()
    {
        // Arrange — project exists but the target principalId is not a collaborator
        var project = BuildProject(id: "proj-no-collab");
        var (repo, _) = BuildSut(new[] { project });
        // No ReplaceOneAsync call expected — the removed count is 0 and the method
        // short-circuits before calling Replace.

        // Act
        var result = await repo.RemoveCollaboratorAsync("proj-no-collab", "nonexistent-user");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task RemoveCollaboratorAsync_ReturnsTrueWhenCollaboratorRemoved()
    {
        // Arrange
        var collab = BuildCollaborator(principalId: "user-to-remove");
        var project = BuildProject(id: "proj-remove",
            collaborators: new List<ProjectCollaboratorDocument> { collab });
        var (repo, collectionMock) = BuildSut(new[] { project });
        collectionMock
            .Setup(c => c.ReplaceOneAsync(
                It.IsAny<FilterDefinition<ProjectDocument>>(),
                It.IsAny<ProjectDocument>(),
                It.IsAny<ReplaceOptions>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ReplaceOneResult.Acknowledged(1, 1, null));

        // Act
        var result = await repo.RemoveCollaboratorAsync("proj-remove", "user-to-remove");

        // Assert
        result.Should().BeTrue();
    }
}
