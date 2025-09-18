// Phase 1: Create User-Assigned Managed Identities
// These identities will be used by Container Apps in later phases

param namePrefix string
param location string = resourceGroup().location

// User-assigned managed identity for backend Container App
resource backendIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${namePrefix}-backend-identity'
  location: location
}

// User-assigned managed identity for frontend Container App
resource frontendIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${namePrefix}-frontend-identity'
  location: location
}

// Outputs for use in later phases
output backendIdentityId string = backendIdentity.id
output backendIdentityPrincipalId string = backendIdentity.properties.principalId
output backendIdentityClientId string = backendIdentity.properties.clientId
output backendIdentityName string = backendIdentity.name

output frontendIdentityId string = frontendIdentity.id
output frontendIdentityPrincipalId string = frontendIdentity.properties.principalId
output frontendIdentityClientId string = frontendIdentity.properties.clientId
output frontendIdentityName string = frontendIdentity.name