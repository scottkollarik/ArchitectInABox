namespace TechnicalArchitectPlatform.CatalogRefresh.Models;

/// <summary>
/// Represents a single price entry from the Azure Retail Prices API.
/// See: https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices
/// </summary>
public sealed record AzurePriceItem(
    decimal RetailPrice,
    string UnitOfMeasure,
    string SkuName,
    string ProductName,
    string CurrencyCode,
    string ServiceName,
    string ServiceFamily,
    string Location
);
