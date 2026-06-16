using TechnicalArchitectPlatform.Api.Models;

namespace TechnicalArchitectPlatform.CatalogRefresh;

/// <summary>
/// Baseline seed records used when the azureServiceCatalog collection is empty.
/// These provide Claude with a starting structure to build upon.
/// </summary>
internal static class SeedData
{
    public static IReadOnlyList<AzureServiceDocument> BaselineServices { get; } =
    [
        new AzureServiceDocument
        {
            Id = "azure-container-apps",
            Name = "Azure Container Apps",
            Category = "Compute",
            Tier = "PaaS",
            Description = "Serverless container hosting with automatic scaling and built-in Dapr support.",
            ArchitectureRole = "core",
            Tags = ["containers", "serverless", "microservices"],
            Documentation = "https://learn.microsoft.com/en-us/azure/container-apps/",
            AvailablePublic = true,
            AvailableGov = false,
            Pricing = new ServicePricingDocument { Tier = "Consumption", Estimate = "~$0-30/month at low scale", Unit = "vCPU-s + GiB-s" }
        },
        new AzureServiceDocument
        {
            Id = "azure-functions",
            Name = "Azure Functions",
            Category = "Compute",
            Tier = "PaaS",
            Description = "Event-driven serverless compute with per-execution billing and extensive trigger support.",
            ArchitectureRole = "core",
            Tags = ["serverless", "event-driven", "functions"],
            Documentation = "https://learn.microsoft.com/en-us/azure/azure-functions/",
            AvailablePublic = true,
            AvailableGov = true,
            Pricing = new ServicePricingDocument { Tier = "Consumption", Estimate = "Free up to 1M executions/month", Unit = "executions + GB-s" }
        },
        new AzureServiceDocument
        {
            Id = "azure-kubernetes-service",
            Name = "Azure Kubernetes Service",
            Category = "Compute",
            Tier = "PaaS",
            Description = "Managed Kubernetes cluster with integrated monitoring, scaling, and Azure AD integration.",
            ArchitectureRole = "core",
            Tags = ["kubernetes", "containers", "orchestration"],
            Documentation = "https://learn.microsoft.com/en-us/azure/aks/",
            AvailablePublic = true,
            AvailableGov = true,
            Pricing = new ServicePricingDocument { Tier = "Standard", Estimate = "~$72/month (uptime SLA) + VM costs", Unit = "cluster + node VMs" }
        },
        new AzureServiceDocument
        {
            Id = "azure-app-service",
            Name = "Azure App Service",
            Category = "Compute",
            Tier = "PaaS",
            Description = "Fully managed platform for web apps, REST APIs, and mobile backends.",
            ArchitectureRole = "core",
            Tags = ["web", "api", "hosting"],
            Documentation = "https://learn.microsoft.com/en-us/azure/app-service/",
            AvailablePublic = true,
            AvailableGov = true,
            Pricing = new ServicePricingDocument { Tier = "Basic B1", Estimate = "~$13/month", Unit = "per plan" }
        },
        new AzureServiceDocument
        {
            Id = "azure-cosmos-db",
            Name = "Azure Cosmos DB",
            Category = "Database",
            Tier = "PaaS",
            Description = "Globally distributed, multi-model NoSQL database with single-digit millisecond latency.",
            ArchitectureRole = "core",
            Tags = ["nosql", "database", "globally-distributed"],
            Documentation = "https://learn.microsoft.com/en-us/azure/cosmos-db/",
            AvailablePublic = true,
            AvailableGov = true,
            Pricing = new ServicePricingDocument { Tier = "Serverless", Estimate = "~$0.25 per million RU", Unit = "RU/s" }
        },
        new AzureServiceDocument
        {
            Id = "azure-sql-database",
            Name = "Azure SQL Database",
            Category = "Database",
            Tier = "PaaS",
            Description = "Fully managed relational database with built-in intelligence, high availability, and elastic scaling.",
            ArchitectureRole = "core",
            Tags = ["sql", "relational", "database"],
            Documentation = "https://learn.microsoft.com/en-us/azure/azure-sql/database/",
            AvailablePublic = true,
            AvailableGov = true,
            Pricing = new ServicePricingDocument { Tier = "General Purpose", Estimate = "~$150/month (2 vCores)", Unit = "per database" }
        },
        new AzureServiceDocument
        {
            Id = "azure-blob-storage",
            Name = "Azure Blob Storage",
            Category = "Storage",
            Tier = "PaaS",
            Description = "Massively scalable object storage for unstructured data including images, videos, and backups.",
            ArchitectureRole = "supporting",
            Tags = ["storage", "blobs", "object-store"],
            Documentation = "https://learn.microsoft.com/en-us/azure/storage/blobs/",
            AvailablePublic = true,
            AvailableGov = true,
            Pricing = new ServicePricingDocument { Tier = "Hot LRS", Estimate = "~$0.018/GB/month", Unit = "GB stored + operations" }
        },
        new AzureServiceDocument
        {
            Id = "azure-table-storage",
            Name = "Azure Table Storage",
            Category = "Storage",
            Tier = "PaaS",
            Description = "Key-attribute NoSQL store for structured non-relational data with low cost and simple access.",
            ArchitectureRole = "supporting",
            Tags = ["nosql", "storage", "table"],
            Documentation = "https://learn.microsoft.com/en-us/azure/storage/tables/",
            AvailablePublic = true,
            AvailableGov = true,
            Pricing = new ServicePricingDocument { Tier = "LRS", Estimate = "~$0.065/GB/month", Unit = "GB stored + operations" }
        },
        new AzureServiceDocument
        {
            Id = "azure-cognitive-search",
            Name = "Azure AI Search",
            Category = "AI + ML",
            Tier = "PaaS",
            Description = "AI-powered search service with semantic ranking, vector search, and integrated skillsets.",
            ArchitectureRole = "supporting",
            Tags = ["search", "ai", "vector-search"],
            Documentation = "https://learn.microsoft.com/en-us/azure/search/",
            AvailablePublic = true,
            AvailableGov = false,
            Pricing = new ServicePricingDocument { Tier = "Free", Estimate = "Free (1 index, 50MB)", Unit = "per service" }
        },
        new AzureServiceDocument
        {
            Id = "azure-key-vault",
            Name = "Azure Key Vault",
            Category = "Security",
            Tier = "PaaS",
            Description = "Cloud service for securely storing and accessing secrets, keys, and certificates.",
            ArchitectureRole = "supporting",
            Tags = ["security", "secrets", "encryption"],
            Documentation = "https://learn.microsoft.com/en-us/azure/key-vault/",
            AvailablePublic = true,
            AvailableGov = true,
            Pricing = new ServicePricingDocument { Tier = "Standard", Estimate = "~$0.03/10k operations", Unit = "operations" }
        },
        new AzureServiceDocument
        {
            Id = "azure-front-door",
            Name = "Azure Front Door",
            Category = "Networking",
            Tier = "PaaS",
            Description = "Global CDN and load balancer with WAF, DDoS protection, and intelligent routing.",
            ArchitectureRole = "core",
            Tags = ["cdn", "networking", "load-balancer", "waf"],
            Documentation = "https://learn.microsoft.com/en-us/azure/frontdoor/",
            AvailablePublic = true,
            AvailableGov = false,
            Pricing = new ServicePricingDocument { Tier = "Standard", Estimate = "~$35/month base", Unit = "per endpoint + data transfer" }
        },
        new AzureServiceDocument
        {
            Id = "azure-virtual-network",
            Name = "Azure Virtual Network",
            Category = "Networking",
            Tier = "IaaS",
            Description = "Isolated private network in Azure for secure communication between resources.",
            ArchitectureRole = "core",
            Tags = ["networking", "vnet", "private"],
            Documentation = "https://learn.microsoft.com/en-us/azure/virtual-network/",
            AvailablePublic = true,
            AvailableGov = true,
            Pricing = new ServicePricingDocument { Tier = "Standard", Estimate = "Free (outbound data charges apply)", Unit = "per VNet" }
        },
        new AzureServiceDocument
        {
            Id = "azure-active-directory-b2c",
            Name = "Azure AD B2C",
            Category = "Identity",
            Tier = "SaaS",
            Description = "Customer identity and access management (CIAM) with customizable sign-in flows.",
            ArchitectureRole = "core",
            Tags = ["identity", "auth", "b2c", "ciam"],
            Documentation = "https://learn.microsoft.com/en-us/azure/active-directory-b2c/",
            AvailablePublic = true,
            AvailableGov = false,
            Pricing = new ServicePricingDocument { Tier = "Free tier", Estimate = "Free up to 50k MAU", Unit = "MAU" }
        },
        new AzureServiceDocument
        {
            Id = "azure-monitor",
            Name = "Azure Monitor",
            Category = "Management + Governance",
            Tier = "PaaS",
            Description = "Full-stack observability platform for collecting, analyzing, and acting on telemetry.",
            ArchitectureRole = "supporting",
            Tags = ["monitoring", "observability", "alerts"],
            Documentation = "https://learn.microsoft.com/en-us/azure/azure-monitor/",
            AvailablePublic = true,
            AvailableGov = true,
            Pricing = new ServicePricingDocument { Tier = "Pay-as-you-go", Estimate = "~$2.76/GB ingested", Unit = "GB data ingested" }
        },
        new AzureServiceDocument
        {
            Id = "azure-application-insights",
            Name = "Azure Application Insights",
            Category = "Management + Governance",
            Tier = "PaaS",
            Description = "APM service for live application monitoring with distributed tracing and smart detection.",
            ArchitectureRole = "supporting",
            Tags = ["apm", "tracing", "monitoring"],
            Documentation = "https://learn.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview",
            AvailablePublic = true,
            AvailableGov = true,
            Pricing = new ServicePricingDocument { Tier = "Pay-as-you-go", Estimate = "Free up to 5GB/month", Unit = "GB data ingested" }
        },
        new AzureServiceDocument
        {
            Id = "service-bus",
            Name = "Azure Service Bus",
            Category = "Integration",
            Tier = "PaaS",
            Description = "Fully managed enterprise message broker with queues, topics, and sessions.",
            ArchitectureRole = "supporting",
            Tags = ["messaging", "queues", "pub-sub"],
            Documentation = "https://learn.microsoft.com/en-us/azure/service-bus-messaging/",
            AvailablePublic = true,
            AvailableGov = true,
            Pricing = new ServicePricingDocument { Tier = "Standard", Estimate = "~$10/month (1M ops)", Unit = "million operations" }
        },
        new AzureServiceDocument
        {
            Id = "event-hubs",
            Name = "Azure Event Hubs",
            Category = "Integration",
            Tier = "PaaS",
            Description = "Big data streaming platform and event ingestion service with Kafka protocol compatibility.",
            ArchitectureRole = "supporting",
            Tags = ["streaming", "events", "kafka", "ingestion"],
            Documentation = "https://learn.microsoft.com/en-us/azure/event-hubs/",
            AvailablePublic = true,
            AvailableGov = true,
            Pricing = new ServicePricingDocument { Tier = "Basic", Estimate = "~$22/month (1 TU)", Unit = "throughput units" }
        },
        new AzureServiceDocument
        {
            Id = "azure-cache-redis",
            Name = "Azure Cache for Redis",
            Category = "Cache",
            Tier = "PaaS",
            Description = "Fully managed Redis cache for high-throughput, low-latency data access.",
            ArchitectureRole = "supporting",
            Tags = ["cache", "redis", "performance"],
            Documentation = "https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/",
            AvailablePublic = true,
            AvailableGov = true,
            Pricing = new ServicePricingDocument { Tier = "Basic C0", Estimate = "~$16/month", Unit = "per instance" }
        },
        new AzureServiceDocument
        {
            Id = "container-registry",
            Name = "Azure Container Registry",
            Category = "Developer Tools",
            Tier = "PaaS",
            Description = "Private Docker registry for storing and managing container images and artifacts.",
            ArchitectureRole = "supporting",
            Tags = ["containers", "registry", "devops"],
            Documentation = "https://learn.microsoft.com/en-us/azure/container-registry/",
            AvailablePublic = true,
            AvailableGov = true,
            Pricing = new ServicePricingDocument { Tier = "Basic", Estimate = "~$5/month", Unit = "per registry" }
        },
        new AzureServiceDocument
        {
            Id = "managed-identity",
            Name = "Azure Managed Identity",
            Category = "Identity",
            Tier = "PaaS",
            Description = "Automatically managed Azure AD identity for authenticating to any service supporting Azure AD auth — no secrets needed.",
            ArchitectureRole = "supporting",
            Tags = ["identity", "auth", "zero-trust"],
            Documentation = "https://learn.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/",
            AvailablePublic = true,
            AvailableGov = true,
            Pricing = new ServicePricingDocument { Tier = "Free", Estimate = "Free", Unit = "per identity" }
        }
    ];
}
