param namePrefix string
param backendImage string
param frontendImage string
param location string = resourceGroup().location
param appShortName string = 'aib'
param enableSearch bool = false
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

// Container Apps environment
resource cae 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: '${namePrefix}-cae'
  location: location
  properties: {}
}

// Backend Container App
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
          env: [
            { name: 'PathBase', value: '/${appShortName}' }
            { name: 'ASPNETCORE_ENVIRONMENT', value: 'Production' }
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

// Frontend Container App
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

// SIMPLE outputs (no complex property references)
output storageAccountName string = sa.name
output cosmosAccountName string = cosmos.name
output backendAppName string = backend.name
output frontendAppName string = frontend.name