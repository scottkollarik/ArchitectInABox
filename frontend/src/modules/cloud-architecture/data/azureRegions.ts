export interface AzureRegion {
  id: string
  name: string
  geography: string
  cloudFamily: 'public' | 'gov' | 'china'
  sovereign?: boolean
}

// Curated subset of regions with clear names
export const azureRegions: AzureRegion[] = [
  // North America
  { id: 'eastus', name: 'US East (Virginia)', geography: 'United States', cloudFamily: 'public' },
  { id: 'eastus2', name: 'US East 2 (Virginia)', geography: 'United States', cloudFamily: 'public' },
  { id: 'centralus', name: 'US Central (Iowa)', geography: 'United States', cloudFamily: 'public' },
  { id: 'westus2', name: 'US West 2 (Washington)', geography: 'United States', cloudFamily: 'public' },
  { id: 'westus3', name: 'US West 3 (Arizona)', geography: 'United States', cloudFamily: 'public' },
  { id: 'canadacentral', name: 'Canada Central (Toronto)', geography: 'Canada', cloudFamily: 'public' },
  { id: 'canadaeast', name: 'Canada East (Quebec City)', geography: 'Canada', cloudFamily: 'public' },

  // Europe
  { id: 'westeurope', name: 'Europe West (Netherlands)', geography: 'Europe', cloudFamily: 'public' },
  { id: 'northeurope', name: 'Europe North (Ireland)', geography: 'Europe', cloudFamily: 'public' },
  { id: 'uksouth', name: 'UK South (London)', geography: 'United Kingdom', cloudFamily: 'public' },
  { id: 'ukwest', name: 'UK West (Cardiff)', geography: 'United Kingdom', cloudFamily: 'public' },
  { id: 'francecentral', name: 'France Central (Paris)', geography: 'France', cloudFamily: 'public' },
  { id: 'germanywestcentral', name: 'Germany West Central (Frankfurt)', geography: 'Germany', cloudFamily: 'public' },
  { id: 'switzerlandnorth', name: 'Switzerland North (Zurich)', geography: 'Switzerland', cloudFamily: 'public' },

  // APAC
  { id: 'australiaeast', name: 'Australia East (Sydney)', geography: 'Australia', cloudFamily: 'public' },
  { id: 'australiasoutheast', name: 'Australia Southeast (Melbourne)', geography: 'Australia', cloudFamily: 'public' },
  { id: 'japaneast', name: 'Japan East (Tokyo)', geography: 'Japan', cloudFamily: 'public' },
  { id: 'japanwest', name: 'Japan West (Osaka)', geography: 'Japan', cloudFamily: 'public' },
  { id: 'koreacentral', name: 'Korea Central (Seoul)', geography: 'Korea', cloudFamily: 'public' },
  { id: 'centralindia', name: 'India Central (Pune)', geography: 'India', cloudFamily: 'public' },
  { id: 'southindia', name: 'India South (Chennai)', geography: 'India', cloudFamily: 'public' },
  { id: 'southeastasia', name: 'Southeast Asia (Singapore)', geography: 'Southeast Asia', cloudFamily: 'public' },
  { id: 'eastasia', name: 'East Asia (Hong Kong)', geography: 'East Asia', cloudFamily: 'public' },

  // Other
  { id: 'brazilsouth', name: 'Brazil South (São Paulo State)', geography: 'Brazil', cloudFamily: 'public' },
  { id: 'southafricanorth', name: 'South Africa North (Johannesburg)', geography: 'South Africa', cloudFamily: 'public' },
  { id: 'uaenorth', name: 'UAE North (Dubai)', geography: 'UAE', cloudFamily: 'public' },

  // US Government (Sovereign)
  { id: 'usgovvirginia', name: 'US Gov Virginia', geography: 'United States (Gov)', cloudFamily: 'gov', sovereign: true },
  { id: 'usgovarizona', name: 'US Gov Arizona', geography: 'United States (Gov)', cloudFamily: 'gov', sovereign: true },
  { id: 'usgovtexas', name: 'US Gov Texas', geography: 'United States (Gov)', cloudFamily: 'gov', sovereign: true },
  { id: 'usdodeast', name: 'US DoD East', geography: 'United States (DoD)', cloudFamily: 'gov', sovereign: true },
  { id: 'usdodcentral', name: 'US DoD Central', geography: 'United States (DoD)', cloudFamily: 'gov', sovereign: true },
]

// Azure paired regions (simplified mapping)
export const pairedRegionMap: Record<string, string> = {
  // US
  eastus: 'westus2',
  eastus2: 'centralus',
  centralus: 'eastus2',
  westus2: 'eastus',
  westus3: 'eastus',

  // Canada
  canadacentral: 'canadaeast',
  canadaeast: 'canadacentral',

  // Europe
  westeurope: 'northeurope',
  northeurope: 'westeurope',
  uksouth: 'ukwest',
  ukwest: 'uksouth',
  francecentral: 'westeurope',
  germanywestcentral: 'westeurope',
  switzerlandnorth: 'westeurope',

  // APAC
  australiaeast: 'australiasoutheast',
  australiasoutheast: 'australiaeast',
  japaneast: 'japanwest',
  japanwest: 'japaneast',
  koreacentral: 'japaneast',
  centralindia: 'southindia',
  southindia: 'centralindia',
  southeastasia: 'eastasia',
  eastasia: 'southeastasia',

  // Other
  brazilsouth: 'southafricanorth',
  southafricanorth: 'brazilsouth',
  uaenorth: 'westeurope',

  // US Gov (simplified; ensure same-family pairing)
  usgovvirginia: 'usgovarizona',
  usgovarizona: 'usgovvirginia',
  usgovtexas: 'usgovarizona',
  usdodeast: 'usdodcentral',
  usdodcentral: 'usdodeast',
}

export const getPairedRegion = (primaryId: string): string | undefined => pairedRegionMap[primaryId]

export const getRegionById = (id: string): AzureRegion | undefined => azureRegions.find(r => r.id === id)
