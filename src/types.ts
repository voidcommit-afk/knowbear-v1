export interface PinnedTopic {
    id: string
    title: string
    description: string
}

export interface QueryRequest {
    topic: string
    levels?: string[]
    premium?: boolean
    mode?: 'fast' | 'ensemble' | 'brief_dive'
}

export type Mode = 'fast' | 'ensemble' | 'brief_dive'

export interface QueryResponse {
    topic: string
    explanations: Record<string, string>
    cached: boolean
}

export interface ExportRequest {
    topic: string
    explanations: Record<string, string>
    format: 'txt' | 'json' | 'pdf' | 'md'
}

export const FREE_LEVELS = ['eli5', 'eli10', 'eli12', 'eli15', 'meme', 'classic60', 'gentle70', 'warm80'] as const
export const PREMIUM_LEVELS = ['technical', 'systemic', 'diagram'] as const
export type Level = (typeof FREE_LEVELS)[number] | (typeof PREMIUM_LEVELS)[number]
