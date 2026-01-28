import type { PinnedTopic, QueryRequest, QueryResponse, ExportRequest } from './types'

const API_URL = import.meta.env.VITE_API_URL || ''

import { supabase } from './lib/supabase'

async function fetchAPI<T>(path: string, options?: RequestInit & { responseType?: 'json' | 'blob' }): Promise<T> {
    const { data: { session } } = await supabase.auth.getSession()
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options?.headers,
    }

    if (session?.access_token) {
        // @ts-ignore - HeadersInit type flexibility
        headers['Authorization'] = `Bearer ${session.access_token}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 90000) // 90 seconds

    try {
        const res = await fetch(`${API_URL}${path}`, {
            ...options,
            headers,
            signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (res.status === 429) throw new Error('You are sending requests too quickly. Please wait a moment.')
        if (!res.ok) throw new Error(`API error: ${res.status}`)

        if (options?.responseType === 'blob') {
            return await res.blob() as unknown as T
        }
        return await res.json()
    } catch (err: any) {
        clearTimeout(timeoutId)
        if (err.name === 'AbortError') throw new Error('Request timed out. Please try again.')
        throw err
    }
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

export async function queryTopicStream(
    req: QueryRequest,
    onChunk: (chunk: string) => void,
    onDone: (data: any) => void,
    onError: (err: any) => void,
    signal?: AbortSignal
) {
    const { data: { session } } = await supabase.auth.getSession()
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    }
    if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
    }

    try {
        const response = await fetch(`${API_URL}/api/query/stream`, {
            method: 'POST',
            headers,
            body: JSON.stringify(req),
            signal,
        })

        if (!response.ok) throw new Error(`API error: ${response.status}`)

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) throw new Error('ReadableStream not supported')

        let buffer = ''
        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6)
                    if (data === '[DONE]') {
                        onDone({})
                        continue
                    }
                    try {
                        const parsed = JSON.parse(data)
                        if (parsed.chunk) {
                            onChunk(parsed.chunk)
                        } else if (parsed.error) {
                            onError(new Error(parsed.error))
                        }
                    } catch (e) {
                        console.error('Failed to parse stream chunk', e)
                    }
                }
            }
        }
    } catch (err) {
        onError(err)
    }
}

export async function exportExplanations(req: ExportRequest): Promise<Blob> {
    return fetchAPI('/api/export', {
        method: 'POST',
        body: JSON.stringify(req),
        responseType: 'blob'
    })
}

export async function getHistory(): Promise<any[]> {
    return fetchAPI('/api/history')
}

export async function deleteHistoryItem(id: string): Promise<void> {
    return fetchAPI(`/api/history/${id}`, { method: 'DELETE' })
}

export async function clearHistory(): Promise<void> {
    return fetchAPI('/api/history', { method: 'DELETE' })
}
