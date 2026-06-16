using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using TechnicalArchitectPlatform.Api.Models;

namespace TechnicalArchitectPlatform.CatalogRefresh;

/// <summary>
/// Top-level orchestrator: runs CatalogRefreshJob then NfrRecommendationJob in sequence,
/// writing a CatalogRefreshRunDocument to record the outcome.
/// </summary>
internal sealed class CatalogRefreshOrchestrator
{
    private const string RunsCollectionName = "catalogRefreshRuns";

    private readonly IMongoCollection<CatalogRefreshRunDocument> _runsCollection;
    private readonly CatalogRefreshJob _catalogJob;
    private readonly NfrRecommendationJob _nfrJob;
    private readonly ILogger<CatalogRefreshOrchestrator> _logger;

    public CatalogRefreshOrchestrator(
        IMongoDatabase database,
        CatalogRefreshJob catalogJob,
        NfrRecommendationJob nfrJob,
        ILogger<CatalogRefreshOrchestrator> logger)
    {
        _runsCollection = database.GetCollection<CatalogRefreshRunDocument>(RunsCollectionName);
        _catalogJob = catalogJob;
        _nfrJob = nfrJob;
        _logger = logger;
    }

    /// <summary>
    /// Runs both jobs and persists the run record.
    /// Returns true if both jobs succeeded, false if either failed.
    /// </summary>
    public async Task<bool> RunAsync(CancellationToken cancellationToken = default)
    {
        var run = new CatalogRefreshRunDocument
        {
            Id = Guid.NewGuid().ToString("N"),
            StartedAt = DateTime.UtcNow,
            Success = false
        };

        _logger.LogInformation("=== CatalogRefreshOrchestrator starting (runId={RunId}) ===", run.Id);

        var catalogSuccess = false;
        var nfrSuccess = false;

        // --- Step 1: Catalog refresh ---
        try
        {
            _logger.LogInformation("Starting catalog refresh job...");
            run.ServicesUpserted = await _catalogJob.RunAsync(cancellationToken);
            catalogSuccess = true;
            _logger.LogInformation("Catalog refresh complete. Services upserted: {Count}", run.ServicesUpserted);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Catalog refresh job failed");
            run.ErrorMessage = $"Catalog refresh failed: {ex.Message}";
            // Fall through — attempt NFR job using whatever is already in DB
        }

        // --- Step 2: NFR recommendation generation ---
        try
        {
            _logger.LogInformation("Starting NFR recommendation job...");
            run.RecommendationRulesUpserted = await _nfrJob.RunAsync(cancellationToken);
            nfrSuccess = true;
            _logger.LogInformation("NFR recommendation job complete. Rules inserted: {Count}",
                run.RecommendationRulesUpserted);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "NFR recommendation job failed");

            var nfrError = $"NFR job failed: {ex.Message}";
            run.ErrorMessage = run.ErrorMessage is null
                ? nfrError
                : $"{run.ErrorMessage}; {nfrError}";
        }

        // --- Finalise run record ---
        run.Success = catalogSuccess && nfrSuccess;
        run.CompletedAt = DateTime.UtcNow;

        await PersistRunRecordAsync(run, cancellationToken);

        _logger.LogInformation(
            "=== CatalogRefreshOrchestrator finished (runId={RunId}, success={Success}, services={Services}, rules={Rules}) ===",
            run.Id, run.Success, run.ServicesUpserted, run.RecommendationRulesUpserted);

        return run.Success;
    }

    private async Task PersistRunRecordAsync(CatalogRefreshRunDocument run, CancellationToken ct)
    {
        try
        {
            await _runsCollection.InsertOneAsync(run, cancellationToken: ct);
            _logger.LogDebug("Run record persisted (runId={RunId})", run.Id);
        }
        catch (Exception ex)
        {
            // Don't fail the whole job just because audit logging failed
            _logger.LogError(ex, "Failed to persist run record (runId={RunId})", run.Id);
        }
    }
}
