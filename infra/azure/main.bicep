// AIB 6-Phase Deployment Orchestrator
// This is the new main.bicep that orchestrates the 6-phase deployment system
// For production use, prefer the individual phase scripts for better control

// WARNING: This template deploys everything at once and may encounter
// the Key Vault chicken-and-egg problem. Use the phase scripts instead:
// ./scripts/azure/deploy-aib-complete.sh

param namePrefix string
@description('Short application name for URLs/paths (e.g., aib)')
param appShortName string = 'aib'
param location string = resourceGroup().location

// Container images (use placeholder images initially)
param backendImage string = 'mcr.microsoft.com/dotnet/samples:aspnetapp'
param frontendImage string = 'nginx:alpine'

// Global Key Vault parameters
param globalKeyVaultName string
param globalKeyVaultResourceGroup string

// Optional parameters
@description('Enable Azure AI Search (costs per hour). Default: false')
param enableSearch bool = false
@description('Custom domain for frontend (e.g., www.technologoo.com). Leave empty for default Azure domain')
param customDomain string = ''

// Phase 1: Deploy managed identities
module identities 'templates/phase1-identities.bicep' = {
  name: 'phase1-identities'
  params: {
    namePrefix: namePrefix
    location: location
  }
}

// Phase 2: Deploy infrastructure with identities
module infrastructure 'templates/phase2-infrastructure.bicep' = {
  name: 'phase2-infrastructure'
  dependsOn: [identities]
  params: {
    namePrefix: namePrefix
    appShortName: appShortName
    location: location
    backendIdentityId: identities.outputs.backendIdentityId
    frontendIdentityId: identities.outputs.frontendIdentityId
    placeholderBackendImage: backendImage
    placeholderFrontendImage: frontendImage
  }
}

// Phase 3: Wire up Key Vault (role assignments only via Bicep)
module keyvaultWiring 'templates/phase3-keyvault-wiring.bicep' = {
  name: 'phase3-keyvault-wiring'
  dependsOn: [infrastructure]
  params: {
    namePrefix: namePrefix
    globalKeyVaultName: globalKeyVaultName
    globalKeyVaultResourceGroup: globalKeyVaultResourceGroup
    backendIdentityPrincipalId: identities.outputs.backendIdentityPrincipalId
    frontendIdentityPrincipalId: identities.outputs.frontendIdentityPrincipalId
  }
}

// Phase 5: Configure resource permissions (skip Phase 4 - needs script intervention)
module permissions 'templates/phase5-permissions.bicep' = {
  name: 'phase5-permissions'
  dependsOn: [keyvaultWiring]
  params: {
    namePrefix: namePrefix
    backendIdentityPrincipalId: identities.outputs.backendIdentityPrincipalId
    frontendIdentityPrincipalId: identities.outputs.frontendIdentityPrincipalId
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

// Outputs
output phase1Outputs object = {
  backendIdentityId: identities.outputs.backendIdentityId
  frontendIdentityId: identities.outputs.frontendIdentityId
  backendIdentityPrincipalId: identities.outputs.backendIdentityPrincipalId
  frontendIdentityPrincipalId: identities.outputs.frontendIdentityPrincipalId
}

output phase2Outputs object = {
  storageAccountName: infrastructure.outputs.storageAccountName
  cosmosAccountName: infrastructure.outputs.cosmosAccountName
  containerEnvironmentName: infrastructure.outputs.containerEnvironmentName
  backendAppName: infrastructure.outputs.backendAppName
  frontendAppName: infrastructure.outputs.frontendAppName
  backendUrl: infrastructure.outputs.backendUrl
  frontendUrl: infrastructure.outputs.frontendUrl
}

output keyVaultUri string = keyvaultWiring.outputs.keyVaultUri
output searchServiceName string = enableSearch ? search.name : 'disabled'
output customDomainConfigured string = !empty(customDomain) ? 'true' : 'false'

// Important notes for post-deployment
output postDeploymentSteps object = {
  phase4Required: 'Update Container Apps with private images using scripts'
  phase6Required: 'Configure OAuth and user access using scripts'
  recommendedApproach: 'Use ./scripts/azure/deploy-aib-complete.sh instead of this template'
}