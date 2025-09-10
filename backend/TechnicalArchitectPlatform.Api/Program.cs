using MongoDB.Driver;
using System.Text.Json;

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

var app = builder.Build();

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

// Run the application
app.Run();