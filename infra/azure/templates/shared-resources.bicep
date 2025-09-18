// Shared resources and parameters for 6-phase deployment
// Used by all phase-specific templates

// Common parameters
param namePrefix string
@description('Short application name for URLs/paths (e.g., aib)')
param appShortName string = 'aib'
param location string = resourceGroup().location

// Global Key Vault parameters
param globalKeyVaultName string
param globalKeyVaultResourceGroup string

// Reference existing external Key Vault
resource globalKv 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: globalKeyVaultName
  scope: resourceGroup(globalKeyVaultResourceGroup)
}

// Common variables
var saName = toLower(replace('${namePrefix}sa${uniqueString(resourceGroup().id)}','-',''))
var cosmosAccountName = '${namePrefix}-cosmos'
var caeKName = '${namePrefix}-cae'
var backendAppName = '${namePrefix}-backend'
var frontendAppName = '${namePrefix}-frontend'
var backendIdentityName = '${namePrefix}-backend-identity'
var frontendIdentityName = '${namePrefix}-frontend-identity'

// Outputs for use by other templates
output globalKeyVault object = globalKv
output storageAccountName string = saName
output cosmosAccountName string = cosmosAccountName
output containerEnvironmentName string = caeKName
output backendAppName string = backendAppName
output frontendAppName string = frontendAppName
output backendIdentityName string = backendIdentityName
output frontendIdentityName string = frontendIdentityName
output namePrefix string = namePrefix
output appShortName string = appShortName
output location string = location