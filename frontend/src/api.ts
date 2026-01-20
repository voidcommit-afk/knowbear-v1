import type { PinnedTopic, QueryRequest, QueryResponse, ExportRequest } from './types'

const API_URL = import.meta.env.VITE_API_URL || ''

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
    })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
}

export async function getPinnedTopics(): Promise<PinnedTopic[]> {
    return fetchAPI('/api/pinned')
}

export async function queryTopic(req: QueryRequest): Promise<QueryResponse> {
    return fetchAPI('/api/query', {
        method: 'POST',
        body: JSON.stringify(req),
    })
}

export async function exportExplanations(req: ExportRequest): Promise<Blob> {
    const res = await fetch(`${API_URL}/api/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
    })
    if (!res.ok) throw new Error(`Export error: ${res.status}`)
    return res.blob()
}
