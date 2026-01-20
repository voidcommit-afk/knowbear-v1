export interface PinnedTopic {
    id: string
    title: string
    description: string
}

export interface QueryRequest {
    topic: string
    levels?: string[]
    premium?: boolean
    mode?: 'fast' | 'ensemble'
}

export interface QueryResponse {
    topic: string
    explanations: Record<string, string>
    cached: boolean
}

export interface ExportRequest {
    topic: string
    explanations: Record<string, string>
    format: 'txt' | 'json' | 'pdf'
}

export const FREE_LEVELS = ['eli5', 'eli10', 'eli12', 'eli15', 'meme'] as const
export const PREMIUM_LEVELS = ['technical', 'systemic', 'diagram'] as const
export type Level = (typeof FREE_LEVELS)[number] | (typeof PREMIUM_LEVELS)[number]
