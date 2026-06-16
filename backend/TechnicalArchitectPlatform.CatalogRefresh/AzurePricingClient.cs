using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using TechnicalArchitectPlatform.CatalogRefresh.Models;

namespace TechnicalArchitectPlatform.CatalogRefresh;

/// <summary>
/// Fetches retail pricing data from the Azure Retail Prices REST API.
/// Documentation: https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices
/// </summary>
internal sealed class AzurePricingClient
{
    private const string DefaultPricingApiBase = "https://prices.azure.com";
    private const string PricingApiPath = "/api/retail/prices";
    private const string TargetRegion = "eastus";
    private const string TargetCurrency = "USD";

    // Key services we fetch pricing for on each refresh (not all 300+).
    // These represent the most commonly architectured services.
    public static readonly IReadOnlyList<string> RepresentativeServiceNames =
    [
        "Azure Container Apps",
        "Azure Functions",
        "Azure Kubernetes Service",
        "Azure App Service",
        "Azure Cosmos DB",
        "Azure SQL Database",
        "Azure Blob Storage",
        "Azure Cache for Redis",
        "Azure Front Door",
        "Azure Key Vault",
        "Azure Service Bus",
        "Azure Event Hubs",
        "Azure Monitor",
        "Azure Container Registry",
        "Azure Cognitive Search",
        "Azure SignalR Service",
        "Azure API Management",
        "Azure Virtual Network",
        "Azure Application Gateway",
        "Azure Load Balancer"
    ];

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        NumberHandling = JsonNumberHandling.AllowReadingFromString
    };

    private readonly HttpClient _httpClient;
    private readonly string _apiBase;
    private readonly ILogger<AzurePricingClient> _logger;

    public AzurePricingClient(string apiBase, ILogger<AzurePricingClient> logger)
    {
        _apiBase = apiBase.TrimEnd('/');
        _logger = logger;
        _httpClient = new HttpClient();
    }

    /// <summary>
    /// Fetches retail price items for a given Azure service name.
    /// Returns up to the first page of results (approx. 100 items).
    /// </summary>
    public async Task<List<AzurePriceItem>> GetPricesAsync(string serviceName)
    {
        // OData filter: serviceName eq '...' and armRegionName eq 'eastus' and currencyCode eq 'USD'
        var filter = Uri.EscapeDataString(
            $"serviceName eq '{serviceName}' and armRegionName eq '{TargetRegion}' and currencyCode eq '{TargetCurrency}'");

        var url = $"{_apiBase}{PricingApiPath}?$filter={filter}";

        _logger.LogDebug("Fetching prices for service: {ServiceName}", serviceName);

        using var response = await _httpClient.GetAsync(url);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            _logger.LogWarning("Azure Pricing API returned {StatusCode} for {ServiceName}: {Body}",
                response.StatusCode, serviceName, body);
            return [];
        }

        var json = await response.Content.ReadAsStringAsync();

        AzurePricingApiResponse? apiResponse;
        try
        {
            apiResponse = JsonSerializer.Deserialize<AzurePricingApiResponse>(json, SerializerOptions);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse pricing API response for {ServiceName}", serviceName);
            return [];
        }

        if (apiResponse?.Items is null)
            return [];

        return apiResponse.Items
            .Select(item => new AzurePriceItem(
                RetailPrice: decimal.TryParse(item.RetailPrice, out var price) ? price : 0m,
                UnitOfMeasure: item.UnitOfMeasure,
                SkuName: item.SkuName,
                ProductName: item.ProductName,
                CurrencyCode: item.CurrencyCode,
                ServiceName: item.ServiceName,
                ServiceFamily: item.ServiceFamily,
                Location: item.ArmRegionName
            ))
            .ToList();
    }
}
