using MongoDB.Driver;
using System.Text.Json;
using Azure.Storage.Blobs;
using TechnicalArchitectPlatform.Api.Artifacts;
using TechnicalArchitectPlatform.Api.Models;
using TechnicalArchitectPlatform.Api.Vector;
using System.Linq;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

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
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Configure JSON options
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.WriteIndented = true;
});

// Configure MongoDB (for future use)
builder.Services.AddSingleton<IMongoClient>(serviceProvider =>
{
    var connectionString = builder.Configuration.GetConnectionString("MongoDB") 
                          ?? "mongodb://admin:password123@mongodb:27017/technical-architect-db?authSource=admin";
    return new MongoClient(connectionString);
});

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

app.UseCors();

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

// Dev user info (simulate OAuth) — reads headers if present, else returns a default dev user
api.MapGet("/me", (HttpRequest req) =>
{
    var id = req.Headers["X-User-Id"].FirstOrDefault() ?? "dev-user-1";
    var email = req.Headers["X-User-Email"].FirstOrDefault() ?? "dev.user@example.com";
    var name = req.Headers["X-User-Name"].FirstOrDefault() ?? "Dev User";
    var tenant = req.Headers["X-Tenant-Id"].FirstOrDefault();
    return Results.Ok(new TechnicalArchitectPlatform.Api.Models.UserDto(
        Id: id,
        Provider: "dev",
        Subject: id,
        Email: email,
        DisplayName: name,
        TenantId: tenant
    ));
})
.WithName("GetMe")
.WithSummary("Get current user (dev)")
.WithDescription("Development-only user info via headers (X-User-*) or defaults");

// Mongo helpers
IMongoDatabase GetDb(IMongoClient client)
{
    // Use DB name from connection string or fallback
    // If DB not specified, default to 'technical-architect-db'
    return client.GetDatabase("technical-architect-db");
}

FilterDefinition<ProjectDocument> BuildAccessFilter(string scope, string id)
{
    var ownerFilter = Builders<ProjectDocument>.Filter.And(
        Builders<ProjectDocument>.Filter.Eq(x => x.OwnerScope, scope),
        Builders<ProjectDocument>.Filter.Eq(x => x.OwnerId, id)
    );
    var collaboratorFilter = Builders<ProjectDocument>.Filter.ElemMatch(x => x.Collaborators,
        c => c.PrincipalType == scope && c.PrincipalId == id);
    return Builders<ProjectDocument>.Filter.Or(ownerFilter, collaboratorFilter);
}

bool HasOwnerAccess(ProjectDocument project, string scope, string id) =>
    project.OwnerScope == scope && project.OwnerId == id;

bool HasReadAccess(ProjectDocument project, string scope, string id)
    => HasOwnerAccess(project, scope, id) || (project.Collaborators?.Any(c => c.PrincipalType == scope && c.PrincipalId == id) ?? false);

bool HasWriteAccess(ProjectDocument project, string scope, string id)
    => HasOwnerAccess(project, scope, id) || (project.Collaborators?.Any(c => c.PrincipalType == scope && c.PrincipalId == id && (c.Role == "owner" || c.Role == "contributor")) ?? false);

// Projects API (upsert + list/get)
api.MapGet("/projects", async (IMongoClient client, string ownerScope, string ownerId, CancellationToken ct) =>
{
    var db = GetDb(client);
    var col = db.GetCollection<ProjectDocument>("projects");
    var filter = BuildAccessFilter(ownerScope, ownerId);
    var list = await col.Find(filter).ToListAsync(ct);
    return Results.Ok(list);
})
.WithName("ListProjects")
.WithSummary("List projects by owner")
.WithDescription("Returns projects for a given ownerScope and ownerId");

api.MapGet("/projects/{id}", async (IMongoClient client, string ownerScope, string ownerId, string id, CancellationToken ct) =>
{
    var db = GetDb(client);
    var col = db.GetCollection<ProjectDocument>("projects");
    var doc = await col.Find(x => x.Id == id).FirstOrDefaultAsync(ct);
    if (doc is null) return Results.NotFound();
    if (!HasReadAccess(doc, ownerScope, ownerId)) return Results.Forbid();
    return Results.Ok(doc);
})
.WithName("GetProject")
.WithSummary("Get a project by id");

api.MapPost("/projects", async (IMongoClient client, string ownerScope, string ownerId, ProjectDocument project, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(project.Id)) return Results.BadRequest(new { message = "id required" });
    var db = GetDb(client);
    var col = db.GetCollection<ProjectDocument>("projects");
    project.OwnerScope = ownerScope;
    project.OwnerId = ownerId;
    project.OrgId = project.OrgId;
    project.Collaborators ??= new();
    project.Collaborators.RemoveAll(c => c.PrincipalType == ownerScope && c.PrincipalId == ownerId); // owner implicit
    project.LastModified = project.LastModified == default ? DateTime.UtcNow : project.LastModified;
    project.CreatedAt = project.CreatedAt == default ? DateTime.UtcNow : project.CreatedAt;
    var res = await col.ReplaceOneAsync(x => x.Id == project.Id, project, new ReplaceOptions { IsUpsert = true }, ct);
    return Results.Ok(project);
})
.WithName("UpsertProject")
.WithSummary("Create or update a project by id");

api.MapPut("/projects/{id}", async (IMongoClient client, string ownerScope, string ownerId, string id, ProjectDocument project, CancellationToken ct) =>
{
    project.Id = id;
    var db = GetDb(client);
    var col = db.GetCollection<ProjectDocument>("projects");
    var existing = await col.Find(x => x.Id == id).FirstOrDefaultAsync(ct);
    if (existing is null) return Results.NotFound();
    if (!HasOwnerAccess(existing, ownerScope, ownerId)) return Results.Forbid();
    project.OwnerScope = existing.OwnerScope;
    project.OwnerId = existing.OwnerId;
    project.OrgId = existing.OrgId;
    project.CreatedAt = existing.CreatedAt;
    project.Collaborators ??= new();
    project.Collaborators.RemoveAll(c => c.PrincipalType == project.OwnerScope && c.PrincipalId == project.OwnerId);
    project.LastModified = DateTime.UtcNow;
    var res = await col.ReplaceOneAsync(x => x.Id == id, project, new ReplaceOptions { IsUpsert = true }, ct);
    return Results.Ok(project);
})
.WithName("PutProject")
.WithSummary("Replace a project by id");

// NFR API (get/put per project)
api.MapGet("/projects/{projectId}/nfr", async (IMongoClient client, string ownerScope, string ownerId, string projectId, CancellationToken ct) =>
{
    var db = GetDb(client);
    var col = db.GetCollection<NfrAssessmentDocument>("nfrAssessments");
    var projects = db.GetCollection<ProjectDocument>("projects");
    var project = await projects.Find(x => x.Id == projectId).FirstOrDefaultAsync(ct);
    if (project is null) return Results.NotFound();
    if (!HasReadAccess(project, ownerScope, ownerId)) return Results.Forbid();
    var doc = await col.Find(x => x.ProjectId == projectId).FirstOrDefaultAsync(ct);
    return doc is null ? Results.NotFound() : Results.Ok(doc);
})
.WithName("GetProjectNfr")
.WithSummary("Get NFR assessment for a project");

api.MapPut("/projects/{projectId}/nfr", async (IMongoClient client, string ownerScope, string ownerId, string projectId, NfrAssessmentDocument body, CancellationToken ct) =>
{
    var db = GetDb(client);
    var col = db.GetCollection<NfrAssessmentDocument>("nfrAssessments");
    var projects = db.GetCollection<ProjectDocument>("projects");
    var project = await projects.Find(x => x.Id == projectId).FirstOrDefaultAsync(ct);
    if (project is null) return Results.NotFound();
    if (!HasWriteAccess(project, ownerScope, ownerId)) return Results.Forbid();
    body.ProjectId = projectId;
    if (string.IsNullOrWhiteSpace(body.Id)) body.Id = projectId;
    body.LastModified = DateTime.UtcNow;
    if (body.CreatedAt == default) body.CreatedAt = DateTime.UtcNow;
    var res = await col.ReplaceOneAsync(x => x.ProjectId == projectId, body, new ReplaceOptions { IsUpsert = true }, ct);
    return Results.Ok(body);
})
.WithName("PutProjectNfr")
.WithSummary("Upsert NFR assessment for a project");

// Sharing endpoints
record ProjectShareRequest(string PrincipalType, string PrincipalId, string Role);

api.MapGet("/projects/{id}/shares", async (IMongoClient client, string ownerScope, string ownerId, string id, CancellationToken ct) =>
{
    var db = GetDb(client);
    var col = db.GetCollection<ProjectDocument>("projects");
    var project = await col.Find(x => x.Id == id).FirstOrDefaultAsync(ct);
    if (project is null) return Results.NotFound();
    if (!HasOwnerAccess(project, ownerScope, ownerId)) return Results.Forbid();
    return Results.Ok(project.Collaborators ?? new());
})
.WithName("ListProjectShares")
.WithSummary("List collaborators for a project");

api.MapPost("/projects/{id}/shares", async (IMongoClient client, string ownerScope, string ownerId, string id, ProjectShareRequest request, CancellationToken ct) =>
{
    var db = GetDb(client);
    var col = db.GetCollection<ProjectDocument>("projects");
    var project = await col.Find(x => x.Id == id).FirstOrDefaultAsync(ct);
    if (project is null) return Results.NotFound();
    if (!HasOwnerAccess(project, ownerScope, ownerId)) return Results.Forbid();

    if (request.PrincipalType == project.OwnerScope && request.PrincipalId == project.OwnerId)
        return Results.BadRequest(new { message = "Owner already has full access" });

    var allowedRoles = new[] { "owner", "contributor", "reader" };
    if (!allowedRoles.Contains(request.Role))
        return Results.BadRequest(new { message = "Invalid role" });

    var collaborators = project.Collaborators ?? new();
    collaborators.RemoveAll(c => c.PrincipalType == request.PrincipalType && c.PrincipalId == request.PrincipalId);
    collaborators.Add(new ProjectCollaboratorDocument
    {
        PrincipalType = request.PrincipalType,
        PrincipalId = request.PrincipalId,
        Role = request.Role,
        AddedAt = DateTime.UtcNow
    });
    project.Collaborators = collaborators;
    project.LastModified = DateTime.UtcNow;
    await col.ReplaceOneAsync(x => x.Id == id, project, new ReplaceOptions { IsUpsert = true }, ct);
    return Results.Ok(project.Collaborators);
})
.WithName("UpsertProjectShare")
.WithSummary("Add or update a collaborator on a project");

api.MapDelete("/projects/{id}/shares/{principalId}", async (IMongoClient client, string ownerScope, string ownerId, string id, string principalId, CancellationToken ct) =>
{
    var db = GetDb(client);
    var col = db.GetCollection<ProjectDocument>("projects");
    var project = await col.Find(x => x.Id == id).FirstOrDefaultAsync(ct);
    if (project is null) return Results.NotFound();
    if (!HasOwnerAccess(project, ownerScope, ownerId)) return Results.Forbid();
    project.Collaborators ??= new();
    project.Collaborators.RemoveAll(c => c.PrincipalId == principalId);
    project.LastModified = DateTime.UtcNow;
    await col.ReplaceOneAsync(x => x.Id == id, project, new ReplaceOptions { IsUpsert = true }, ct);
    return Results.NoContent();
})
.WithName("DeleteProjectShare")
.WithSummary("Remove a collaborator from a project");

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

// Architecture endpoints (stubbed for now)
api.MapGet("/architecture/services", () =>
{
    return Results.Ok(new { message = "Azure services catalog endpoint ready" });
})
.WithName("GetAzureServices")
.WithSummary("Get Azure services catalog")
.WithDescription("Returns the catalog of available Azure services with categories");

api.MapPost("/architecture/recommend", (object nfrAssessment) =>
{
    return Results.Ok(new { message = "Architecture recommendations generated", input = nfrAssessment });
})
.WithName("GenerateRecommendations")
.WithSummary("Generate architecture recommendations")
.WithDescription("Generates Azure architecture recommendations based on NFR assessment");

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
