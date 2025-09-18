// Phase 5: Configure Resource Permissions
// Grant managed identities access to CosmosDB and Storage Account

param namePrefix string
// Identity parameters (from Phase 1)
param backendIdentityPrincipalId string
param frontendIdentityPrincipalId string
// Storage account name is provided by the phase script (deterministically discovered)
@description('Existing storage account name (resolved in deployment script).')
param storageAccountName string

// Reference existing resources
resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' existing = {
  name: '${namePrefix}-cosmos'
}

resource sa 'Microsoft.Storage/storageAccounts@2023-01-01' existing = {
  name: storageAccountName
}

// Grant backend identity access to CosmosDB (Built-in Data Contributor)
resource backendCosmosRoleAssignment 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2023-04-15' = {
  name: guid('CosmosBuiltInDataContributor', backendIdentityPrincipalId)
  parent: cosmos
  properties: {
    principalId: backendIdentityPrincipalId
    roleDefinitionId: '${cosmos.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002'
    scope: '/'
  }
}

// Grant backend identity access to Storage Account (for artifacts)
resource backendStorageRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(sa.id, backendIdentityPrincipalId, 'Storage Blob Data Contributor')
  scope: sa
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe') // Storage Blob Data Contributor
    principalId: backendIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// Grant frontend identity read access to Storage Account (for static assets if needed)
resource frontendStorageRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(sa.id, frontendIdentityPrincipalId, 'Storage Blob Data Reader')
  scope: sa
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1') // Storage Blob Data Reader
    principalId: frontendIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// Outputs
output cosmosAccountName string = cosmos.name
output storageAccountName string = sa.name
output backendCosmosRoleAssignmentId string = backendCosmosRoleAssignment.id
output backendStorageRoleAssignmentId string = backendStorageRoleAssignment.id
output frontendStorageRoleAssignmentId string = frontendStorageRoleAssignment.id
