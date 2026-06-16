using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using TechnicalArchitectPlatform.CatalogRefresh;

// ────────────────────────────────────────────────────────────────────────────
// Bootstrap logging first so all errors are visible even during config load.
// ────────────────────────────────────────────────────────────────────────────
using var loggerFactory = LoggerFactory.Create(builder =>
{
    builder
        .SetMinimumLevel(LogLevel.Information)
        .AddConsole();
});

var rootLogger = loggerFactory.CreateLogger("Bootstrap");
rootLogger.LogInformation("TechnicalArchitectPlatform.CatalogRefresh starting...");

// ────────────────────────────────────────────────────────────────────────────
// Load config from environment variables.
// ────────────────────────────────────────────────────────────────────────────
AppConfig config;
try
{
    config = AppConfig.FromEnvironment();
    rootLogger.LogInformation("Config loaded. Database={DatabaseName}, PricingApi={PricingApi}",
        config.DatabaseName, config.AzurePricingApiBase);
}
catch (InvalidOperationException ex)
{
    rootLogger.LogCritical(ex, "Configuration error — cannot start");
    return 1;
}

// ────────────────────────────────────────────────────────────────────────────
// Wire up dependencies.
// ────────────────────────────────────────────────────────────────────────────
try
{
    var mongoClient = new MongoClient(config.MongoConnectionString);
    var database = mongoClient.GetDatabase(config.DatabaseName);

    var claude = new ClaudeClient(
        config.AnthropicApiKey,
        loggerFactory.CreateLogger<ClaudeClient>());

    var pricingClient = new AzurePricingClient(
        config.AzurePricingApiBase,
        loggerFactory.CreateLogger<AzurePricingClient>());

    var catalogJob = new CatalogRefreshJob(
        database,
        claude,
        pricingClient,
        loggerFactory.CreateLogger<CatalogRefreshJob>());

    var nfrJob = new NfrRecommendationJob(
        database,
        claude,
        loggerFactory.CreateLogger<NfrRecommendationJob>());

    var orchestrator = new CatalogRefreshOrchestrator(
        database,
        catalogJob,
        nfrJob,
        loggerFactory.CreateLogger<CatalogRefreshOrchestrator>());

    // ────────────────────────────────────────────────────────────────────────
    // Run the job.
    // ────────────────────────────────────────────────────────────────────────
    using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(30));

    var success = await orchestrator.RunAsync(cts.Token);

    if (success)
    {
        rootLogger.LogInformation("Job completed successfully. Exiting 0.");
        return 0;
    }
    else
    {
        rootLogger.LogError("Job completed with errors. Check logs above. Exiting 1.");
        return 1;
    }
}
catch (Exception ex)
{
    rootLogger.LogCritical(ex, "Unhandled exception — job aborted");
    return 1;
}
