param accountName string
param dbName string
param containerName string
param partitionKey string

resource container 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  name: '${accountName}/${dbName}/${containerName}'
  properties: {
    resource: {
      id: containerName
      partitionKey: {
        paths: [ partitionKey ]
        kind: 'Hash'
      }
    }
  }
}