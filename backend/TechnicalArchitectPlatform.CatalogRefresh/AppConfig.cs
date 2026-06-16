namespace TechnicalArchitectPlatform.CatalogRefresh;

/// <summary>
/// Reads and validates all required configuration from environment variables.
/// </summary>
internal sealed record AppConfig
{
    private const string DefaultDatabaseName = "tapdb";
    private const string DefaultPricingApiBase = "https://prices.azure.com";

    public string MongoConnectionString { get; init; }
    public string DatabaseName { get; init; }
    public string AnthropicApiKey { get; init; }
    public string AzurePricingApiBase { get; init; }

    private AppConfig(
        string mongoConnectionString,
        string databaseName,
        string anthropicApiKey,
        string azurePricingApiBase)
    {
        MongoConnectionString = mongoConnectionString;
        DatabaseName = databaseName;
        AnthropicApiKey = anthropicApiKey;
        AzurePricingApiBase = azurePricingApiBase;
    }

    /// <summary>
    /// Reads config from environment variables and throws <see cref="InvalidOperationException"/>
    /// for any missing required values.
    /// </summary>
    public static AppConfig FromEnvironment()
    {
        // Accept MONGODB_CONNECTION_STRING or COSMOSDB_CONNECTION_STRING (CosmosDB Mongo API compat)
        var mongoConnectionString =
            GetRequired("MONGODB_CONNECTION_STRING", "COSMOSDB_CONNECTION_STRING");

        var anthropicApiKey = GetRequired("ANTHROPIC_API_KEY");

        var databaseName = Environment.GetEnvironmentVariable("DATABASE_NAME")
            ?? DefaultDatabaseName;

        var pricingApiBase = Environment.GetEnvironmentVariable("AZURE_PRICING_API_BASE")
            ?? DefaultPricingApiBase;

        return new AppConfig(mongoConnectionString, databaseName, anthropicApiKey, pricingApiBase);
    }

    private static string GetRequired(params string[] keys)
    {
        foreach (var key in keys)
        {
            var value = Environment.GetEnvironmentVariable(key);
            if (!string.IsNullOrWhiteSpace(value))
                return value;
        }

        throw new InvalidOperationException(
            $"Required environment variable not set. Tried: {string.Join(", ", keys)}");
    }
}
