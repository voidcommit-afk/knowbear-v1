export interface PinnedTopic {
    id: string
    title: string
    description: string
}

export interface QueryRequest {
    topic: string
    levels?: string[]
    mode?: 'fast' | 'ensemble'
    retrieval?: 'auto' | 'required' | 'on' | 'off'
    temperature?: number
    regenerate?: boolean
}

export type Mode = 'fast' | 'ensemble'
export type StreamStatus = 'idle' | 'live' | 'fallback' | 'degraded'

export interface QueryResponse {
    topic: string
    explanations: Record<string, string>
    mode?: Mode
}

export const ALL_LEVELS = ['eli5', 'eli12', 'eli15', 'meme'] as const
export type Level = (typeof ALL_LEVELS)[number]
