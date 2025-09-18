// Phase 4: Deploy Applications with Private Container Images
// Update Container Apps to use private GitHub registry with Key Vault authentication

param namePrefix string
@description('Short application name for URLs/paths (e.g., aib)')
param appShortName string = 'aib'

// Production container images
param backendImage string
param frontendImage string

// Key Vault parameters
param globalKeyVaultName string
param globalKeyVaultResourceGroup string

// Reference existing external Key Vault
resource globalKv 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: globalKeyVaultName
  scope: resourceGroup(globalKeyVaultResourceGroup)
}

// Reference existing Container Apps to update them
resource backend 'Microsoft.App/containerApps@2023-05-01' existing = {
  name: '${namePrefix}-backend'
}

resource frontend 'Microsoft.App/containerApps@2023-05-01' existing = {
  name: '${namePrefix}-frontend'
}

// Note: The actual Container Apps image updates and registry configuration
// will be handled by the deployment script using Azure CLI since Bicep
// cannot easily modify existing Container Apps without full redeployment.

// This template serves as documentation of what Phase 4 should accomplish:
// 1. Update backend Container App image to: ${backendImage}
// 2. Update frontend Container App image to: ${frontendImage}
// 3. Configure registry authentication using Key Vault secret: github-token-aib
// 4. Restart Container Apps to pull new images

// Outputs
output targetBackendImage string = backendImage
output targetFrontendImage string = frontendImage
output githubTokenSecretUrl string = '${globalKv.properties.vaultUri}secrets/github-token-aib'