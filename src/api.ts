import type { PinnedTopic, QueryRequest, QueryResponse, ExportRequest } from './types'

const API_URL = import.meta.env.VITE_API_URL || ''

import { supabase } from './lib/supabase'

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
    const { data: { session } } = await supabase.auth.getSession()
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options?.headers,
    }

    if (session?.access_token) {
        // @ts-ignore - HeadersInit type flexibility
        headers['Authorization'] = `Bearer ${session.access_token}`
    }

    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
    })
    if (res.status === 429) throw new Error('You are sending requests too quickly. Please wait a moment.')
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
