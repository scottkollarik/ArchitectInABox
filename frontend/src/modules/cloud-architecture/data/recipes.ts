export interface NFRRecipe {
  id: string
  name: string
  description: string
  // Map questionId -> value to prefill (non-destructive)
  defaults: Record<string, any>
}

export const nfrRecipes: NFRRecipe[] = [
  {
    id: 'oltp-standard',
    name: 'OLTP Standard',
    description: 'Strong consistency, read-heavy workload defaults',
    defaults: {
      'consistency-level': 'Strong',
      'read-write-ratio': { read: 80, write: 20 },
      'data-storage-config': {
        'storage-type': 'Relational (SQL)',
        'consistency-requirement': 'Strong (ACID)'
      }
    }
  },
  {
    id: 'read-heavy-analytics',
    name: 'Read-heavy Analytics',
    description: 'Eventual or bounded consistency with high read ratio',
    defaults: {
      'consistency-level': 'Bounded-staleness',
      'read-write-ratio': { read: 95, write: 5 },
      'data-storage-config': {
        'storage-type': 'Document (NoSQL)',
        'consistency-requirement': 'Bounded-staleness',
        'access-pattern': 'Real-time Analytics'
      }
    }
  },
  {
    id: 'event-streaming',
    name: 'Event Streaming',
    description: 'Write-focused ingestion with eventual consistency defaults',
    defaults: {
      'consistency-level': 'Eventual',
      'read-write-ratio': { read: 20, write: 80 },
      'data-storage-config': {
        'storage-type': 'Time-series',
        'consistency-requirement': 'Eventual'
      }
    }
  }
]

