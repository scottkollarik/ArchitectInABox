using MongoDB.Driver;
using System.Text.Json;
using Azure.Storage.Blobs;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Bson.IO;
using MongoDB.Bson.Serialization;
using TechnicalArchitectPlatform.Api.Artifacts;
using TechnicalArchitectPlatform.Api.Models;
using TechnicalArchitectPlatform.Api.Vector;
using System.Linq;
using TechnicalArchitectPlatform.Api.Auth;
using TechnicalArchitectPlatform.Api.Repositories;

var builder = WebApplication.CreateBuilder(args);

var authClientId = builder.Configuration["EntraAuth:ClientId"] ?? Environment.GetEnvironmentVariable("VITE_OAUTH_CLIENT_ID");
var authTenantId = builder.Configuration["EntraAuth:TenantId"] ?? Environment.GetEnvironmentVariable("VITE_OAUTH_TENANT_ID");
var authEnabled = !string.IsNullOrWhiteSpace(authClientId) && !string.IsNullOrWhiteSpace(authTenantId);

if (!string.IsNullOrWhiteSpace(authClientId)) builder.Configuration["EntraAuth:ClientId"] = authClientId;
if (!string.IsNullOrWhiteSpace(authTenantId)) builder.Configuration["EntraAuth:TenantId"] = authTenantId;

builder.Services.AddEntraAuth(builder.Configuration);

// Add services to the container
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Technical Architect Platform API",
        Version = "v1",
        Description = "API for cloud architecture recommendations and NFR assessment",
        Contact = new Microsoft.OpenApi.Models.OpenApiContact
        {
            Name = "Technical Architect Platform",
            Email = "support@techarchitect.com"
        }
    });
});

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                  "https://www.technologoo.com",
                  "https://aib-frontend.yellowriver-26644ae4.eastus.azurecontainerapps.io",
                  "http://localhost:5173",
                  "http://localhost:3000"
              )
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// Configure JSON options
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.WriteIndented = true;
});

var databaseName = builder.Configuration["Database:Name"] ?? "tapdb";
var dbBackend = builder.Configuration["Database:Backend"]?.ToLowerInvariant() ?? "mongodb";

// Configure MongoDB (for future use)
builder.Services.AddSingleton<IMongoClient>(serviceProvider =>
{
    var logger = serviceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("MongoDB");
    var connectionString =
        builder.Configuration.GetConnectionString("MongoDB")
        ?? builder.Configuration.GetConnectionString("CosmosDB")
        ?? builder.Configuration["ConnectionStrings__MongoDB"]
        ?? builder.Configuration["ConnectionStrings__CosmosDB"]
        ?? $"mongodb://admin:password123@mongodb:27017/{databaseName}?authSource=admin";

    var candidates = new List<string>();
    void AddCandidate(string? cs)
    {
        if (string.IsNullOrWhiteSpace(cs)) return;
        if (!candidates.Contains(cs)) candidates.Add(cs);
    }

    AddCandidate(connectionString);
    AddCandidate($"mongodb://admin:password123@localhost:27017/{databaseName}?authSource=admin");

    var extraCandidates = new List<string>();
    foreach (var cs in candidates.ToList())
    {
        if (cs.Contains("@mongodb", StringComparison.OrdinalIgnoreCase))
        {
            extraCandidates.Add(cs.Replace("@mongodb", "@localhost", StringComparison.OrdinalIgnoreCase));
        }
        if (cs.Contains("//mongodb", StringComparison.OrdinalIgnoreCase))
        {
            extraCandidates.Add(cs.Replace("//mongodb", "//localhost", StringComparison.OrdinalIgnoreCase));
        }
    }
    foreach (var candidate in extraCandidates)
    {
        AddCandidate(candidate);
    }

    foreach (var cs in candidates)
    {
        try
        {
            var client = new MongoClient(cs);
            client.GetDatabase(databaseName).RunCommand<BsonDocument>(new BsonDocument("ping", 1));
            if (!string.Equals(cs, connectionString, StringComparison.Ordinal))
            {
                logger.LogInformation("MongoDB connection fallback in use: {ConnectionString}", cs);
            }
            return client;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to connect to MongoDB using {ConnectionString}", cs);
        }
    }

    logger.LogWarning("Using MongoDB connection string without successful ping; database operations may fail.");
    return new MongoClient(connectionString);
});

// Configure Repository Layer

if (dbBackend == "cosmosdb")
{
    builder.Services.AddSingleton<IProjectRepository>(sp =>
        new TechnicalArchitectPlatform.Api.Repositories.CosmosDbProjectRepository(sp.GetRequiredService<IMongoClient>(), databaseName));
    builder.Services.AddSingleton<INfrRepository>(sp =>
        new TechnicalArchitectPlatform.Api.Repositories.CosmosDbNfrRepository(sp.GetRequiredService<IMongoClient>(), databaseName));
    builder.Services.AddSingleton<IUserRepository>(sp =>
        new TechnicalArchitectPlatform.Api.Repositories.CosmosDbUserRepository(sp.GetRequiredService<IMongoClient>(), databaseName));
}
else
{
    builder.Services.AddSingleton<IProjectRepository>(sp =>
        new TechnicalArchitectPlatform.Api.Repositories.MongoDbProjectRepository(sp.GetRequiredService<IMongoClient>(), databaseName));
    builder.Services.AddSingleton<INfrRepository>(sp =>
        new TechnicalArchitectPlatform.Api.Repositories.MongoDbNfrRepository(sp.GetRequiredService<IMongoClient>(), databaseName));
    builder.Services.AddSingleton<IUserRepository>(sp =>
        new TechnicalArchitectPlatform.Api.Repositories.MongoDbUserRepository(sp.GetRequiredService<IMongoClient>(), databaseName));
}

// Configure Artifact Store (Azure Blob in prod, in-memory in dev if no connection)
var blobConn = builder.Configuration.GetConnectionString("AzureBlob") ?? builder.Configuration["AzureBlob:ConnectionString"];
if (!string.IsNullOrWhiteSpace(blobConn))
{
    builder.Services.AddSingleton(new BlobServiceClient(blobConn));
    builder.Services.AddSingleton<IArtifactStore, AzureBlobArtifactStore>();
}
else
{
    builder.Services.AddSingleton<IArtifactStore, InMemoryArtifactStore>();
}

var app = builder.Build();

// Optional path base (for hosting under subpath like /aib)
var pathBase = builder.Configuration["PathBase"] ?? builder.Configuration["ASPNETCORE_PATHBASE"];
if (!string.IsNullOrWhiteSpace(pathBase))
{
    app.UsePathBase(pathBase);
}

// CORS must be before authentication
app.UseCors();

app.UseEntraAuth();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Technical Architect Platform API v1");
        options.RoutePrefix = "swagger";
    });
}

// Health check endpoint
app.MapGet("/health", () => 
{
    return Results.Ok(new 
    { 
        status = "Healthy", 
        timestamp = DateTime.UtcNow,
        version = "1.0.0",
        environment = app.Environment.EnvironmentName
    });
})
.WithName("HealthCheck")
.WithOpenApi();

// API endpoints group
var api = app.MapGroup("/api").WithOpenApi();

if (authEnabled)
{
    api.RequireAuthorization("RequireAuthenticatedUser");
}

// Dev/prod user info endpoint - ensures users are recorded in the database
var meEndpoint = api.MapGet("/me", async (IUserRepository userRepo, HttpContext ctx, CancellationToken ct) =>
{
    var userInfo = await GetUserAsync(ctx, userRepo, ct);
    var userDoc = await userRepo.GetUserByIdAsync(userInfo.Id, ct);

    return Results.Ok(new
    {
        userInfo.Id,
        userInfo.Email,
        userInfo.Name,
        userInfo.IsAuthenticated,
        IsNewUser = userDoc == null,
        HasCompletedOnboarding = userDoc?.HasCompletedOnboarding ?? false,
        CreatedAt = userDoc?.CreatedAt,
        LastSeenAt = userDoc?.LastSeenAt
    });
})
.WithName("GetMe")
.WithSummary("Get current user")
.WithDescription("Returns the resolved user identity and records the user in the database");

if (!authEnabled)
{
    meEndpoint.AllowAnonymous();
}

// Complete onboarding endpoint
var onboardingEndpoint = api.MapPost("/me/complete-onboarding", async (IUserRepository userRepo, HttpContext ctx, CancellationToken ct) =>
{
    var userInfo = await GetUserAsync(ctx, userRepo, ct, trackUser: false);
    await userRepo.CompleteOnboardingAsync(userInfo.Id, ct);
    app.Logger.LogInformation("User {UserId} completed onboarding", userInfo.Id);
    return Results.Ok(new { success = true });
})
.WithName("CompleteOnboarding")
.WithSummary("Mark user onboarding as complete")
.WithDescription("Called when a user completes the initial onboarding flow");

if (!authEnabled)
{
    onboardingEndpoint.AllowAnonymous();
}

// User resolution helper
UserInfo ResolveUser(HttpContext ctx)
{
    if (authEnabled && ctx.User.IsAuthenticated())
    {
        var userInfo = ctx.User.GetUserInfo();
        app.Logger.LogInformation("Authenticated user: {UserId} ({Email})", userInfo.Id, userInfo.Email);
        return userInfo;
    }

    app.Logger.LogDebug("No authentication - using dev/fallback user resolution");

    var id = ctx.Request.Headers["X-User-Id"].FirstOrDefault()
             ?? ctx.Request.Query["ownerId"].FirstOrDefault()
             ?? "dev-user-1";
    var email = ctx.Request.Headers["X-User-Email"].FirstOrDefault()
                ?? ctx.Request.Query["ownerEmail"].FirstOrDefault()
                ?? (ctx.Request.Headers["X-User-Id"].FirstOrDefault() ?? "dev.user") + "@example.com";
    var name = ctx.Request.Headers["X-User-Name"].FirstOrDefault()
               ?? ctx.Request.Query["ownerName"].FirstOrDefault()
               ?? "Dev User";
    return new UserInfo(id, email, name, false);
}

async Task<UserInfo> GetUserAsync(HttpContext ctx, IUserRepository userRepo, CancellationToken ct, bool trackUser = true)
{
    var userInfo = ResolveUser(ctx);
    if (!trackUser || string.IsNullOrWhiteSpace(userInfo.Id))
    {
        return userInfo;
    }

    try
    {
        await userRepo.UpsertUserAsync(userInfo, ct);
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Failed to upsert user {UserId} into datastore", userInfo.Id);
    }

    return userInfo;
}

// Conversion helpers for DTO <-> Persistence models
BsonDocument? ToBson(JsonElement? element)
{
    if (!element.HasValue) return null;
    var value = element.Value;
    if (value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined) return null;
    var json = value.GetRawText();
    return string.IsNullOrWhiteSpace(json) ? null : BsonDocument.Parse(json);
}

BsonValue ToBsonValue(JsonElement? element)
{
    if (!element.HasValue) return BsonNull.Value;
    var value = element.Value;
    if (value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined) return BsonNull.Value;
    var json = value.GetRawText();
    return string.IsNullOrWhiteSpace(json) ? BsonNull.Value : BsonSerializer.Deserialize<BsonValue>(json);
}

// Conversion helpers for DTO <-> Persistence models
ProjectCollaboratorDocument ToCollaboratorDocument(ProjectCollaborator dto) => new()
{
    PrincipalType = dto.PrincipalType,
    PrincipalId = dto.PrincipalId,
    Role = dto.Role,
    AddedAt = dto.AddedAt
};

// Projects API (upsert + list/get)
api.MapGet("/projects", async (IProjectRepository projectRepo, IUserRepository userRepo, HttpContext ctx, CancellationToken ct) =>
{
    var userInfo = await GetUserAsync(ctx, userRepo, ct);
    const string ownerScope = "user";
    var projects = await projectRepo.GetProjectsByUserAsync(ownerScope, userInfo.Id, ct);
    return Results.Ok(projects);
})
.WithName("ListProjects")
.WithSummary("List projects by owner")
.WithDescription("Returns projects visible to the current user");

api.MapGet("/projects/{id}", async (IProjectRepository projectRepo, IUserRepository userRepo, HttpContext ctx, string id, CancellationToken ct) =>
{
    var project = await projectRepo.GetProjectByIdAsync(id, ct);
    if (project is null) return Results.NotFound();
    var userInfo = await GetUserAsync(ctx, userRepo, ct);
    if (!await projectRepo.HasReadAccessAsync(id, "user", userInfo.Id, ct)) return Results.Forbid();
    return Results.Ok(project);
})
.WithName("GetProject")
.WithSummary("Get a project by id");

api.MapPost("/projects", async (IProjectRepository projectRepo, IUserRepository userRepo, HttpContext ctx, ProjectUpsertRequest payload, CancellationToken ct) =>
{
    if (payload is null) return Results.BadRequest(new { message = "Invalid project payload" });
    if (string.IsNullOrWhiteSpace(payload.Id)) return Results.BadRequest(new { message = "id required" });
    var userInfo = await GetUserAsync(ctx, userRepo, ct);
    var project = new ProjectDocument
    {
        Id = payload.Id!,
        Name = string.IsNullOrWhiteSpace(payload.Name) ? "Untitled Project" : payload.Name,
        Description = payload.Description,
        OrgId = payload.OrgId,
        Profile = ToBson(payload.Profile),
        Cloud = ToBson(payload.Cloud),
        Constraints = ToBson(payload.Constraints),
        Architecture = ToBson(payload.Architecture),
        Collaborators = payload.Collaborators?.Select(ToCollaboratorDocument).ToList() ?? new(),
        SchemaVersion = payload.SchemaVersion <= 0 ? 1 : payload.SchemaVersion,
        CreatedAt = payload.CreatedAt == default ? DateTime.UtcNow : payload.CreatedAt,
        LastModified = payload.LastModified == default ? DateTime.UtcNow : payload.LastModified,
        OwnerScope = "user",
        OwnerId = userInfo.Id
    };
    project.Collaborators.RemoveAll(c => c.PrincipalType == "user" && c.PrincipalId == userInfo.Id); // owner implicit
    var result = await projectRepo.UpsertProjectAsync(project, ct);
    return Results.Ok(result);
})
.WithName("UpsertProject")
.WithSummary("Create or update a project by id");

api.MapPut("/projects/{id}", async (IProjectRepository projectRepo, IUserRepository userRepo, HttpContext ctx, string id, ProjectUpsertRequest payload, CancellationToken ct) =>
{
    if (payload is null) return Results.BadRequest(new { message = "Invalid project payload" });
    var existing = await projectRepo.GetProjectByIdAsync(id, ct);
    if (existing is null) return Results.NotFound();
    var userInfo = await GetUserAsync(ctx, userRepo, ct);
    if (!await projectRepo.HasOwnerAccessAsync(id, "user", userInfo.Id, ct)) return Results.Forbid();

    var project = new ProjectDocument
    {
        Id = id,
        OwnerScope = existing.OwnerScope,
        OwnerId = existing.OwnerId,
        OrgId = existing.OrgId,
        Name = string.IsNullOrWhiteSpace(payload.Name) ? existing.Name : payload.Name,
        Description = payload.Description,
        Profile = ToBson(payload.Profile),
        Cloud = ToBson(payload.Cloud),
        Constraints = ToBson(payload.Constraints),
        Architecture = ToBson(payload.Architecture),
        SchemaVersion = payload.SchemaVersion <= 0 ? existing.SchemaVersion : payload.SchemaVersion,
        CreatedAt = existing.CreatedAt,
        LastModified = DateTime.UtcNow,
        Collaborators = payload.Collaborators is not null
            ? payload.Collaborators.Select(ToCollaboratorDocument).ToList()
            : new()
    };
    project.Collaborators.RemoveAll(c => c.PrincipalType == project.OwnerScope && c.PrincipalId == project.OwnerId);
    var result = await projectRepo.UpsertProjectAsync(project, ct);
    return Results.Ok(result);
})
.WithName("PutProject")
.WithSummary("Replace a project by id");

// NFR API (get/put per project)
api.MapGet("/projects/{projectId}/nfr", async (IProjectRepository projectRepo, INfrRepository nfrRepo, IUserRepository userRepo, HttpContext ctx, string projectId, CancellationToken ct) =>
{
    var project = await projectRepo.GetProjectByIdAsync(projectId, ct);
    if (project is null) return Results.NotFound();
    var userInfo = await GetUserAsync(ctx, userRepo, ct);
    if (!await projectRepo.HasReadAccessAsync(projectId, "user", userInfo.Id, ct)) return Results.Forbid();
    var nfr = await nfrRepo.GetByProjectIdAsync(projectId, ct);
    return nfr is null ? Results.NotFound() : Results.Ok(nfr);
})
.WithName("GetProjectNfr")
.WithSummary("Get NFR assessment for a project");

api.MapPut("/projects/{projectId}/nfr", async (IProjectRepository projectRepo, INfrRepository nfrRepo, IUserRepository userRepo, HttpContext ctx, string projectId, NfrAssessmentRequest request, CancellationToken ct) =>
{
    var project = await projectRepo.GetProjectByIdAsync(projectId, ct);
    if (project is null) return Results.NotFound();
    var userInfo = await GetUserAsync(ctx, userRepo, ct);
    if (!await projectRepo.HasWriteAccessAsync(projectId, "user", userInfo.Id, ct)) return Results.Forbid();

    // Map DTO to persistence model
    var document = new NfrAssessmentDocument
    {
        Id = string.IsNullOrWhiteSpace(request.Id) ? projectId : request.Id,
        ProjectId = projectId,
        Sections = ToBsonValue(request.Sections),
        CompletionStatus = ToBsonValue(request.CompletionStatus),
        SchemaVersion = request.SchemaVersion <= 0 ? 1 : request.SchemaVersion,
        CreatedAt = request.CreatedAt == default ? DateTime.UtcNow : request.CreatedAt,
        LastModified = DateTime.UtcNow
    };

    var result = await nfrRepo.UpsertAsync(document, ct);
    return Results.Ok(result);
})
.WithName("PutProjectNfr")
.WithSummary("Upsert NFR assessment for a project");

// Sharing endpoints

api.MapGet("/projects/{id}/shares", async (IProjectRepository projectRepo, IUserRepository userRepo, HttpContext ctx, string id, CancellationToken ct) =>
{
    var project = await projectRepo.GetProjectByIdAsync(id, ct);
    if (project is null) return Results.NotFound();
    var userInfo = await GetUserAsync(ctx, userRepo, ct);
    if (!await projectRepo.HasOwnerAccessAsync(id, "user", userInfo.Id, ct)) return Results.Forbid();
    var collaborators = await projectRepo.GetCollaboratorsAsync(id, ct);
    return Results.Ok(collaborators ?? new List<ProjectCollaborator>());
})
.WithName("ListProjectShares")
.WithSummary("List collaborators for a project");

api.MapPost("/projects/{id}/shares", async (IProjectRepository projectRepo, IUserRepository userRepo, HttpContext ctx, string id, ProjectShareRequest request, CancellationToken ct) =>
{
    var project = await projectRepo.GetProjectByIdAsync(id, ct);
    if (project is null) return Results.NotFound();
    var userInfo = await GetUserAsync(ctx, userRepo, ct);
    if (!await projectRepo.HasOwnerAccessAsync(id, "user", userInfo.Id, ct)) return Results.Forbid();

    if (request.PrincipalType == project.OwnerScope && request.PrincipalId == project.OwnerId)
        return Results.BadRequest(new { message = "Owner already has full access" });

    var allowedRoles = new[] { "owner", "contributor", "reader" };
    if (!allowedRoles.Contains(request.Role))
        return Results.BadRequest(new { message = "Invalid role" });

    var collaborator = new ProjectCollaboratorDocument
    {
        PrincipalType = request.PrincipalType,
        PrincipalId = request.PrincipalId,
        Role = request.Role,
        AddedAt = DateTime.UtcNow
    };

    var collaborators = await projectRepo.AddOrUpdateCollaboratorAsync(id, collaborator, ct);
    return Results.Ok(collaborators);
})
.WithName("UpsertProjectShare")
.WithSummary("Add or update a collaborator on a project");

api.MapDelete("/projects/{id}/shares/{principalId}", async (IProjectRepository projectRepo, IUserRepository userRepo, HttpContext ctx, string id, string principalId, CancellationToken ct) =>
{
    var project = await projectRepo.GetProjectByIdAsync(id, ct);
    if (project is null) return Results.NotFound();
    var userInfo = await GetUserAsync(ctx, userRepo, ct);
    if (!await projectRepo.HasOwnerAccessAsync(id, "user", userInfo.Id, ct)) return Results.Forbid();
    await projectRepo.RemoveCollaboratorAsync(id, principalId, ct);
    return Results.NoContent();
})
.WithName("DeleteProjectShare")
.WithSummary("Remove a collaborator from a project");

api.MapDelete("/projects/{id}", async (IProjectRepository projectRepo, INfrRepository nfrRepo, IUserRepository userRepo, HttpContext ctx, string id, CancellationToken ct) =>
{
    var existing = await projectRepo.GetProjectByIdAsync(id, ct);
    if (existing is null) return Results.NotFound();

    var userInfo = await GetUserAsync(ctx, userRepo, ct);
    if (!await projectRepo.HasOwnerAccessAsync(id, "user", userInfo.Id, ct)) return Results.Forbid();

    await projectRepo.DeleteProjectAsync(id, ct);
    await nfrRepo.DeleteByProjectIdAsync(id, ct);
    return Results.NoContent();
})
.WithName("DeleteProject")
.WithSummary("Delete a project by id");

// NFR endpoints (stubbed for now)
api.MapGet("/nfr/questions", () =>
{
    return Results.Ok(new { message = "NFR questions endpoint ready" });
})
.WithName("GetNFRQuestions")
.WithSummary("Get NFR assessment questions")
.WithDescription("Returns the list of Non-Functional Requirements assessment questions");

api.MapPost("/nfr/assessment", (object assessment) =>
{
    return Results.Ok(new { message = "NFR assessment saved", data = assessment });
})
.WithName("SaveNFRAssessment") 
.WithSummary("Save NFR assessment")
.WithDescription("Saves a completed NFR assessment");

// Architecture endpoints

api.MapGet("/architecture/services", async (HttpContext ctx, CancellationToken ct) =>
{
    var mongoClient = ctx.RequestServices.GetRequiredService<IMongoClient>();
    var db = mongoClient.GetDatabase(databaseName);
    var collection = db.GetCollection<AzureServiceDocument>("azureServiceCatalog");

    var services = await collection
        .Find(Builders<AzureServiceDocument>.Filter.Eq(s => s.IsDeprecated, false))
        .ToListAsync(ct);

    if (services.Count == 0)
    {
        return Results.NotFound(new { message = "Catalog not yet populated — run the refresh job" });
    }

    // Group into { [categoryId]: { id, name, services[] } }
    // Category id is derived from the category string (lowercased, spaces → hyphens).
    var grouped = services
        .GroupBy(s => s.Category)
        .ToDictionary(
            g => g.Key.ToLowerInvariant().Replace(' ', '-'),
            g => new
            {
                id = g.Key.ToLowerInvariant().Replace(' ', '-'),
                name = g.Key,
                services = g.OrderBy(s => s.Name).ToList()
            }
        );

    return Results.Ok(grouped);
})
.WithName("GetAzureServices")
.WithSummary("Get Azure services catalog")
.WithDescription("Returns non-deprecated Azure services grouped by category. Returns 404 if the catalog has not yet been seeded by the refresh job.");

api.MapPost("/architecture/recommend", async (RecommendRequest body, HttpContext ctx, CancellationToken ct) =>
{
    if (body is null)
        return Results.BadRequest(new { message = "Request body is required" });

    var mongoClient = ctx.RequestServices.GetRequiredService<IMongoClient>();
    var db = mongoClient.GetDatabase(databaseName);
    var collection = db.GetCollection<NfrRecommendationRuleDocument>("nfrRecommendations");

    var allRules = await collection.Find(FilterDefinition<NfrRecommendationRuleDocument>.Empty).ToListAsync(ct);

    if (allRules.Count == 0)
    {
        return Results.NotFound(new { message = "Recommendations not yet generated — run the refresh job" });
    }

    // Match rules whose nfrQuestionId appears as a key in the provided nfrAnswers map.
    var answeredQuestionIds = body.NfrAnswers?.Keys.ToHashSet(StringComparer.OrdinalIgnoreCase)
                              ?? new HashSet<string>();

    var matchedRules = allRules
        .Where(r => answeredQuestionIds.Contains(r.NfrQuestionId))
        .OrderBy(r => r.Priority)
        .ToList();

    var recommendedServiceIds = matchedRules
        .SelectMany(r => r.RecommendedServiceIds)
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToList();

    return Results.Ok(new
    {
        recommendedServiceIds,
        rules = matchedRules
    });
})
.WithName("GenerateRecommendations")
.WithSummary("Generate architecture recommendations")
.WithDescription("Matches NFR answers against recommendation rules and returns a deduplicated list of recommended Azure service IDs with the matched rules.");

api.MapPost("/architecture/pricing", (object architectureConfig) =>
{
    return Results.Ok(new { message = "Pricing calculated", input = architectureConfig });
})
.WithName("CalculatePricing")
.WithSummary("Calculate architecture pricing")
.WithDescription("Calculates estimated pricing for the selected architecture");

// Artifact endpoints
var artifacts = api.MapGroup("/projects/{projectId}/artifacts").WithOpenApi();

artifacts.MapGet("/", async (string projectId, IArtifactStore store, CancellationToken ct) =>
{
    var list = new List<ArtifactInfo>();
    await foreach (var a in store.ListAsync(projectId, ct)) list.Add(a);
    return Results.Ok(list.OrderByDescending(a => a.CreatedAt));
})
.WithName("ListArtifacts")
.WithSummary("List project artifacts")
.WithDescription("Lists uploaded artifacts (blueprints, screenshots, schemas, etc.) associated with the project");

artifacts.MapGet("/{artifactId}", async (string projectId, string artifactId, IArtifactStore store, CancellationToken ct) =>
{
    try
    {
        var (stream, info) = await store.DownloadAsync(projectId, artifactId, ct);
        return Results.Stream(stream, info.ContentType, fileDownloadName: info.Name, enableRangeProcessing: true);
    }
    catch (FileNotFoundException)
    {
        return Results.NotFound();
    }
})
.WithName("GetArtifact")
.WithSummary("Download artifact")
.WithDescription("Downloads an artifact by id");

artifacts.MapPost("/upload", async (HttpRequest req, string projectId, IArtifactStore store, CancellationToken ct) =>
{
    if (!req.HasFormContentType) return Results.BadRequest(new { message = "multipart/form-data required" });
    var form = await req.ReadFormAsync(ct);
    var file = form.Files["file"];
    if (file == null || file.Length == 0) return Results.BadRequest(new { message = "file required" });
    var category = form["category"].FirstOrDefault();
    await using var s = file.OpenReadStream();
    var info = await store.UploadAsync(projectId, file.FileName, file.ContentType ?? "application/octet-stream", s, category, ct);
    return Results.Ok(info);
})
.DisableAntiforgery()
.WithName("UploadArtifact")
.WithSummary("Upload artifact")
.WithDescription("Uploads an artifact and associates it with the project");

// Run the application
app.Run();
