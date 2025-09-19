param namePrefix string
@description('Short application name for URLs/paths (e.g., aib)')
param appShortName string = 'aib'
param location string = resourceGroup().location
@description('Container image for backend API (public registry URL)')
param backendImage string
@description('Container image for frontend (public registry URL)')
param frontendImage string
@description('Enable Azure AI Search (costs per hour). Default: false')
param enableSearch bool = false
@description('Custom domain for frontend (e.g., www.technologoo.com). Leave empty for default Azure domain')
param customDomain string = ''
param globalKeyVaultName string
param globalKeyVaultResourceGroup string

// Reference existing external Key Vault
resource globalKv 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: globalKeyVaultName
  scope: resourceGroup(globalKeyVaultResourceGroup)
}

// Storage Account (artifacts, static files)
var saName = toLower(replace('${namePrefix}sa${uniqueString(resourceGroup().id)}','-',''))
resource sa 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: saName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
    publicNetworkAccess: 'Enabled'
  }
}

// Cosmos DB (NoSQL, Serverless)
resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: '${namePrefix}-cosmos'
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
  }
}

// Cosmos database + containers
resource db 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-04-15' = {
  parent: cosmos
  name: 'tapdb'
  properties: {
    resource: { id: 'tapdb' }
  }
}

// Cosmos containers
resource projectsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: db
  name: 'projects'
  properties: {
    resource: {
      id: 'projects'
      partitionKey: {
        paths: [ '/ownerId' ]
        kind: 'Hash'
      }
    }
  }
}

resource nfrContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: db
  name: 'nfrAssessments'
  properties: {
    resource: {
      id: 'nfrAssessments'
      partitionKey: {
        paths: [ '/projectId' ]
        kind: 'Hash'
      }
    }
  }
}

resource logsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: db
  name: 'logs'
  properties: {
    resource: {
      id: 'logs'
      partitionKey: {
        paths: [ '/projectId' ]
        kind: 'Hash'
      }
    }
  }
}

// Container Apps environment
resource cae 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: '${namePrefix}-cae'
  location: location
  properties: {}
}

// Backend Container App (Consumption)
resource backend 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${namePrefix}-backend'
  location: location
  properties: {
    managedEnvironmentId: cae.id
    configuration: {
      ingress: {
        external: true
        targetPort: 5000
      }
      registries: [
        {
          server: 'ghcr.io'
          username: 'scottkollarik'
          passwordSecretRef: 'github-token'
        }
      ]
      secrets: [
        {
          name: 'github-token'
          keyVaultUrl: '${globalKv.properties.vaultUri}secrets/github-token-aib'
          identity: 'system'
        }
      ]
      activeRevisionsMode: 'Single'
    }
    template: {
      containers: [
        {
          name: 'api'
          image: backendImage
          probes: [
            {
              type: 'liveness'
              httpGet: { path: '/health', port: 5000 }
              initialDelaySeconds: 5
            }
          ]
          env: [
            { name: 'PathBase', value: '/${appShortName}' }
            { name: 'ASPNETCORE_ENVIRONMENT', value: 'Production' }
            // Connection strings will be set via Container Apps secrets
            // OAuth settings will be set via Container Apps secrets
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 2
      }
    }
  }
}

// Frontend Container App (Vite preview/server image). Expect it to listen on 5173 or 80 depending on image.
resource frontend 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${namePrefix}-frontend'
  location: location
  properties: {
    managedEnvironmentId: cae.id
    configuration: {
      ingress: {
        external: true
        targetPort: 80
      }
      registries: [
        {
          server: 'ghcr.io'
          username: 'scottkollarik'
          passwordSecretRef: 'github-token'
        }
      ]
      secrets: [
        {
          name: 'github-token'
          keyVaultUrl: '${globalKv.properties.vaultUri}secrets/github-token-aib'
          identity: 'system'
        }
      ]
      activeRevisionsMode: 'Single'
    }
    template: {
      containers: [
        {
          name: 'web'
          image: frontendImage
          env: [
            { name: 'VITE_BASE_PATH', value: '/${appShortName}' }
            { name: 'VITE_API_URL', value: 'https://${backend.name}.${location}.azurecontainerapps.io/${appShortName}/api' }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 2
      }
    }
  }
}

// Optional: Azure AI Search (disabled by default)
resource search 'Microsoft.Search/searchServices@2023-11-01' = if (enableSearch) {
  name: '${namePrefix}-search'
  location: location
  sku: { name: 'basic' }
  properties: {
    hostingMode: 'default'
    partitionCount: 1
    replicaCount: 1
    publicNetworkAccess: 'enabled'
  }
}

output storageAccountName string = sa.name
output cosmosAccountName string = cosmos.name
output containerAppsBackendUrl string = backend.properties.configuration.ingress.fqdn
output containerAppsFrontendUrl string = !empty(customDomain) ? customDomain : frontend.properties.configuration.ingress.fqdn
output containerAppsFrontendDefaultUrl string = frontend.properties.configuration.ingress.fqdn
output searchServiceName string = enableSearch ? search.name : 'disabled'
output customDomainConfigured string = !empty(customDomain) ? 'true' : 'false'
