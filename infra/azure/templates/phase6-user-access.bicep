// Phase 6: Configure User Access and Final Settings
// Set up OAuth configuration and any final user access policies

param namePrefix string
@description('Short application name for URLs/paths (e.g., aib)')
param appShortName string = 'aib'

// OAuth parameters
param clientId string = ''
param tenantId string = ''
param customDomain string = ''

// Reference existing Container Apps
resource backend 'Microsoft.App/containerApps@2023-05-01' existing = {
  name: '${namePrefix}-backend'
}

resource frontend 'Microsoft.App/containerApps@2023-05-01' existing = {
  name: '${namePrefix}-frontend'
}

// Note: Phase 6 is primarily handled by deployment scripts for:
// 1. Configuring OAuth redirect URIs in Entra ID
// 2. Updating Container Apps with OAuth configuration
// 3. Setting up custom domain (if specified)
// 4. Final validation and testing

// Generate the OAuth redirect URI
var frontendFqdn = !empty(customDomain) ? customDomain : frontend.properties.configuration.ingress.fqdn
var oauthRedirectUri = 'https://${frontendFqdn}/${appShortName}/auth/callback'
var apiBaseUrl = 'https://${backend.properties.configuration.ingress.fqdn}/${appShortName}/api'

// Outputs for script configuration
output frontendUrl string = 'https://${frontendFqdn}'
output backendUrl string = apiBaseUrl
output oauthRedirectUri string = oauthRedirectUri
output frontendFqdn string = frontend.properties.configuration.ingress.fqdn
output backendFqdn string = backend.properties.configuration.ingress.fqdn
output customDomainConfigured bool = !empty(customDomain)