// Phase 2: Deploy Core Infrastructure with Pre-existing Identities
// Storage Account, CosmosDB, Container Apps Environment, Container Apps with placeholder images

param namePrefix string
@description('Short application name for URLs/paths (e.g., aib)')
param appShortName string = 'aib'
param location string = resourceGroup().location

// Identity parameters (from Phase 1)
param backendIdentityId string
param frontendIdentityId string

// Placeholder image parameters (will be updated in Phase 4)
param placeholderBackendImage string = 'mcr.microsoft.com/dotnet/samples:aspnetapp'
param placeholderFrontendImage string = 'nginx:alpine'

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

// Backend Container App (with placeholder image and pre-assigned identity)
resource backend 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${namePrefix}-backend'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${backendIdentityId}': {}
    }
  }
  properties: {
    managedEnvironmentId: cae.id
    configuration: {
      ingress: {
        external: true
        targetPort: 5000
      }
      activeRevisionsMode: 'Single'
    }
    template: {
      containers: [
        {
          name: 'api'
          image: placeholderBackendImage
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

// Frontend Container App (with placeholder image and pre-assigned identity)
resource frontend 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${namePrefix}-frontend'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${frontendIdentityId}': {}
    }
  }
  properties: {
    managedEnvironmentId: cae.id
    configuration: {
      ingress: {
        external: true
        targetPort: 80
      }
      activeRevisionsMode: 'Single'
    }
    template: {
      containers: [
        {
          name: 'web'
          image: placeholderFrontendImage
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

// Outputs
output storageAccountName string = sa.name
output cosmosAccountName string = cosmos.name
output containerEnvironmentName string = cae.name
output backendAppName string = backend.name
output frontendAppName string = frontend.name
output backendUrl string = backend.properties.configuration.ingress.fqdn
output frontendUrl string = frontend.properties.configuration.ingress.fqdn