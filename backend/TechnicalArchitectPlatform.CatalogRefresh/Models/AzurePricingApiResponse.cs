namespace TechnicalArchitectPlatform.CatalogRefresh.Models;

/// <summary>
/// Top-level response envelope from the Azure Retail Prices REST API.
/// </summary>
internal sealed record AzurePricingApiResponse(
    AzurePricingApiItem[] Items,
    string? NextPageLink
);

/// <summary>
/// A single item from the Azure Retail Prices API response array.
/// Property names match the API's camelCase JSON keys.
/// </summary>
internal sealed record AzurePricingApiItem(
    string RetailPrice,
    string UnitOfMeasure,
    string SkuName,
    string ProductName,
    string CurrencyCode,
    string ServiceName,
    string ServiceFamily,
    string ArmRegionName
);
