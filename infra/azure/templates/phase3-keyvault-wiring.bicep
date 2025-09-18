// Phase 3: Wire Up Key Vault Access to Container Apps
// Grant managed identities access to Key Vault and configure Container Apps to use secrets

param namePrefix string
param globalKeyVaultName string
param globalKeyVaultResourceGroup string

// Identity parameters (from Phase 1)
param backendIdentityPrincipalId string
param frontendIdentityPrincipalId string

// Reference existing external Key Vault
resource globalKv 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: globalKeyVaultName
  scope: resourceGroup(globalKeyVaultResourceGroup)
}

// Grant backend identity access to Key Vault secrets
resource backendKvRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(globalKv.id, backendIdentityPrincipalId, 'Key Vault Secrets User')
  scope: globalKv
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6') // Key Vault Secrets User
    principalId: backendIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// Grant frontend identity access to Key Vault secrets
resource frontendKvRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(globalKv.id, frontendIdentityPrincipalId, 'Key Vault Secrets User')
  scope: globalKv
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6') // Key Vault Secrets User
    principalId: frontendIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// Reference existing Container Apps to update them
resource backend 'Microsoft.App/containerApps@2023-05-01' existing = {
  name: '${namePrefix}-backend'
}

resource frontend 'Microsoft.App/containerApps@2023-05-01' existing = {
  name: '${namePrefix}-frontend'
}

// Note: The actual Container Apps secret configuration and restart will be handled
// by the deployment script since Bicep can't easily modify existing Container Apps
// configurations without redeploying the entire container.

// Outputs
output keyVaultUri string = globalKv.properties.vaultUri
output backendRoleAssignmentId string = backendKvRoleAssignment.id
output frontendRoleAssignmentId string = frontendKvRoleAssignment.id