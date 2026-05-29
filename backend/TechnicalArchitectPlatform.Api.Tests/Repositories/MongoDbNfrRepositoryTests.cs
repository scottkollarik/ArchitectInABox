using FluentAssertions;
using MongoDB.Bson;
using MongoDB.Driver;
using Moq;
using TechnicalArchitectPlatform.Api.Models;
using TechnicalArchitectPlatform.Api.Repositories;

namespace TechnicalArchitectPlatform.Api.Tests.Repositories;

// IMongoCollectionExtensions.Find() is an extension that wraps an IFindFluent,
// which ultimately calls FindAsync on the interface. Mocking FindAsync is the
// correct seam for unit-testing these repositories.
public class MongoDbNfrRepositoryTests
{
    private static NfrAssessmentDocument BuildNfrDocument(
        string id = "nfr-1",
        string projectId = "proj-1",
        int schemaVersion = 1) => new()
    {
        Id = id,
        ProjectId = projectId,
        Sections = BsonNull.Value,
        CompletionStatus = BsonNull.Value,
        SchemaVersion = schemaVersion,
        CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
        LastModified = new DateTime(2024, 6, 1, 0, 0, 0, DateTimeKind.Utc)
    };

    private static IAsyncCursor<NfrAssessmentDocument> BuildCursor(IEnumerable<NfrAssessmentDocument> items)
    {
        var list = items.ToList();
        var cursor = new Mock<IAsyncCursor<NfrAssessmentDocument>>();
        cursor.SetupSequence(c => c.MoveNextAsync(It.IsAny<CancellationToken>()))
              .ReturnsAsync(list.Count > 0)
              .ReturnsAsync(false);
        cursor.Setup(c => c.Current).Returns(list);
        cursor.Setup(c => c.MoveNext(It.IsAny<CancellationToken>())).Returns(false);
        return cursor.Object;
    }

    private static (MongoDbNfrRepository repo, Mock<IMongoCollection<NfrAssessmentDocument>> collectionMock)
        BuildSut(IEnumerable<NfrAssessmentDocument> collectionContents)
    {
        var cursor = BuildCursor(collectionContents);
        var collectionMock = new Mock<IMongoCollection<NfrAssessmentDocument>>();
        collectionMock
            .Setup(c => c.FindAsync(
                It.IsAny<FilterDefinition<NfrAssessmentDocument>>(),
                It.IsAny<FindOptions<NfrAssessmentDocument, NfrAssessmentDocument>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(cursor);

        var dbMock = new Mock<IMongoDatabase>();
        dbMock
            .Setup(d => d.GetCollection<NfrAssessmentDocument>(It.IsAny<string>(), It.IsAny<MongoCollectionSettings>()))
            .Returns(collectionMock.Object);

        var clientMock = new Mock<IMongoClient>();
        clientMock
            .Setup(c => c.GetDatabase(It.IsAny<string>(), It.IsAny<MongoDatabaseSettings>()))
            .Returns(dbMock.Object);

        return (new MongoDbNfrRepository(clientMock.Object), collectionMock);
    }

    // GetByProjectIdAsync

    [Fact]
    public async Task GetByProjectIdAsync_ReturnsResponseWhenDocumentExists()
    {
        // Arrange
        var document = BuildNfrDocument(id: "nfr-42", projectId: "proj-42");
        var (repo, _) = BuildSut(new[] { document });

        // Act
        var result = await repo.GetByProjectIdAsync("proj-42");

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be("nfr-42");
        result.ProjectId.Should().Be("proj-42");
    }

    [Fact]
    public async Task GetByProjectIdAsync_ReturnsNullWhenNoDocumentFound()
    {
        // Arrange
        var (repo, _) = BuildSut(Array.Empty<NfrAssessmentDocument>());

        // Act
        var result = await repo.GetByProjectIdAsync("missing-proj");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByProjectIdAsync_MapsSchemaVersionFromDocument()
    {
        // Arrange
        var document = BuildNfrDocument(id: "nfr-v2", projectId: "proj-v2", schemaVersion: 2);
        var (repo, _) = BuildSut(new[] { document });

        // Act
        var result = await repo.GetByProjectIdAsync("proj-v2");

        // Assert
        result!.SchemaVersion.Should().Be(2);
    }

    [Fact]
    public async Task GetByProjectIdAsync_MapsDateFieldsFromDocument()
    {
        // Arrange
        var created = new DateTime(2023, 5, 10, 8, 0, 0, DateTimeKind.Utc);
        var modified = new DateTime(2024, 2, 14, 12, 0, 0, DateTimeKind.Utc);
        var document = BuildNfrDocument(projectId: "proj-dates");
        document.CreatedAt = created;
        document.LastModified = modified;
        var (repo, _) = BuildSut(new[] { document });

        // Act
        var result = await repo.GetByProjectIdAsync("proj-dates");

        // Assert
        result!.CreatedAt.Should().Be(created);
        result.LastModified.Should().Be(modified);
    }

    [Fact]
    public async Task GetByProjectIdAsync_ReturnsSectionsAsNullWhenBsonNull()
    {
        // Arrange
        var document = BuildNfrDocument(projectId: "proj-null-sections");
        document.Sections = BsonNull.Value;
        var (repo, _) = BuildSut(new[] { document });

        // Act
        var result = await repo.GetByProjectIdAsync("proj-null-sections");

        // Assert
        result!.Sections.Should().BeNull();
    }

    [Fact]
    public async Task GetByProjectIdAsync_ReturnsCompletionStatusAsNullWhenBsonNull()
    {
        // Arrange
        var document = BuildNfrDocument(projectId: "proj-null-cs");
        document.CompletionStatus = BsonNull.Value;
        var (repo, _) = BuildSut(new[] { document });

        // Act
        var result = await repo.GetByProjectIdAsync("proj-null-cs");

        // Assert
        result!.CompletionStatus.Should().BeNull();
    }

    // UpsertAsync

    [Fact]
    public async Task UpsertAsync_ReturnsResponseForUpsertedDocument()
    {
        // Arrange
        var document = BuildNfrDocument(id: "nfr-upsert", projectId: "proj-upsert");
        var (repo, collectionMock) = BuildSut(Array.Empty<NfrAssessmentDocument>());
        collectionMock
            .Setup(c => c.ReplaceOneAsync(
                It.IsAny<FilterDefinition<NfrAssessmentDocument>>(),
                document,
                It.IsAny<ReplaceOptions>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ReplaceOneResult.Acknowledged(1, 1, null));

        // Act
        var result = await repo.UpsertAsync(document);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be("nfr-upsert");
        result.ProjectId.Should().Be("proj-upsert");
    }

    [Fact]
    public async Task UpsertAsync_CallsReplaceOneWithUpsertTrue()
    {
        // Arrange
        var document = BuildNfrDocument(id: "nfr-flag-check", projectId: "proj-flag");
        var (repo, collectionMock) = BuildSut(Array.Empty<NfrAssessmentDocument>());

        ReplaceOptions? capturedOptions = null;
        collectionMock
            .Setup(c => c.ReplaceOneAsync(
                It.IsAny<FilterDefinition<NfrAssessmentDocument>>(),
                document,
                It.IsAny<ReplaceOptions>(),
                It.IsAny<CancellationToken>()))
            .Callback<FilterDefinition<NfrAssessmentDocument>, NfrAssessmentDocument, ReplaceOptions, CancellationToken>(
                (_, _, opts, _) => capturedOptions = opts)
            .ReturnsAsync(new ReplaceOneResult.Acknowledged(1, 1, null));

        // Act
        await repo.UpsertAsync(document);

        // Assert
        capturedOptions.Should().NotBeNull();
        capturedOptions!.IsUpsert.Should().BeTrue();
    }

    [Fact]
    public async Task UpsertAsync_MapsSchemaVersionToResponse()
    {
        // Arrange
        var document = BuildNfrDocument(id: "nfr-sv", projectId: "proj-sv", schemaVersion: 5);
        var (repo, collectionMock) = BuildSut(Array.Empty<NfrAssessmentDocument>());
        collectionMock
            .Setup(c => c.ReplaceOneAsync(
                It.IsAny<FilterDefinition<NfrAssessmentDocument>>(),
                document,
                It.IsAny<ReplaceOptions>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ReplaceOneResult.Acknowledged(1, 1, null));

        // Act
        var result = await repo.UpsertAsync(document);

        // Assert
        result.SchemaVersion.Should().Be(5);
    }

    [Fact]
    public async Task UpsertAsync_ReturnsSectionsAsNullWhenBsonNull()
    {
        // Arrange
        var document = BuildNfrDocument(projectId: "proj-null-upsert");
        document.Sections = BsonNull.Value;
        document.CompletionStatus = BsonNull.Value;
        var (repo, collectionMock) = BuildSut(Array.Empty<NfrAssessmentDocument>());
        collectionMock
            .Setup(c => c.ReplaceOneAsync(
                It.IsAny<FilterDefinition<NfrAssessmentDocument>>(),
                document,
                It.IsAny<ReplaceOptions>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ReplaceOneResult.Acknowledged(1, 1, null));

        // Act
        var result = await repo.UpsertAsync(document);

        // Assert
        result.Sections.Should().BeNull();
        result.CompletionStatus.Should().BeNull();
    }

    // DeleteByProjectIdAsync

    [Fact]
    public async Task DeleteByProjectIdAsync_ReturnsTrueWhenDocumentDeleted()
    {
        // Arrange
        var (repo, collectionMock) = BuildSut(Array.Empty<NfrAssessmentDocument>());
        collectionMock
            .Setup(c => c.DeleteOneAsync(
                It.IsAny<FilterDefinition<NfrAssessmentDocument>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DeleteResult.Acknowledged(1));

        // Act
        var result = await repo.DeleteByProjectIdAsync("proj-del");

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task DeleteByProjectIdAsync_ReturnsFalseWhenNoDocumentDeleted()
    {
        // Arrange
        var (repo, collectionMock) = BuildSut(Array.Empty<NfrAssessmentDocument>());
        collectionMock
            .Setup(c => c.DeleteOneAsync(
                It.IsAny<FilterDefinition<NfrAssessmentDocument>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DeleteResult.Acknowledged(0));

        // Act
        var result = await repo.DeleteByProjectIdAsync("nonexistent-proj");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task DeleteByProjectIdAsync_PassesCancellationTokenToDriver()
    {
        // Arrange
        using var cts = new CancellationTokenSource();
        CancellationToken capturedToken = default;
        var (repo, collectionMock) = BuildSut(Array.Empty<NfrAssessmentDocument>());
        collectionMock
            .Setup(c => c.DeleteOneAsync(
                It.IsAny<FilterDefinition<NfrAssessmentDocument>>(),
                It.IsAny<CancellationToken>()))
            .Callback<FilterDefinition<NfrAssessmentDocument>, CancellationToken>(
                (_, ct) => capturedToken = ct)
            .ReturnsAsync(new DeleteResult.Acknowledged(1));

        // Act
        await repo.DeleteByProjectIdAsync("proj-ct", cts.Token);

        // Assert
        capturedToken.Should().Be(cts.Token);
    }
}
