import type { PinnedTopic, QueryRequest, QueryResponse, StreamStatus } from './types'

const API_URL = import.meta.env.VITE_API_URL || ''
const IS_DEV = import.meta.env.DEV

function appendRequestId(message: string, requestId: string | null): string {
    if (!requestId) return message
    return `${message} (request id: ${requestId})`
}

function getRequestIdFromResponse(res: Response): string | null {
    return res.headers.get('x-request-id')
}

function createRequestId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }
    return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function getRequestIdFromErrorBody(res: Response): Promise<string | null> {
    try {
        const body = await res.clone().json()
        return body?.request_id ?? null
    } catch {
        return null
    }
}

async function fetchAPI<T>(path: string, options?: RequestInit & { responseType?: 'json' | 'blob' }): Promise<T> {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options?.headers,
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 90000)

    try {
        const res = await fetch(`${API_URL}${path}`, {
            ...options,
            headers,
            signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (res.status === 429) {
            let detail = 'Too many requests. Please try again later.'
            try {
                const body = await res.json()
                const message = body?.detail?.message || body?.detail
                if (typeof message === 'string') detail = message
                const bodyRequestId = typeof body?.request_id === 'string' ? body.request_id : null
                detail = appendRequestId(detail, bodyRequestId || getRequestIdFromResponse(res))
            } catch {
                // ignore parse error and keep default message
                detail = appendRequestId(detail, getRequestIdFromResponse(res))
            }
            throw new Error(detail)
        }

        if (!res.ok) {
            const requestId = getRequestIdFromResponse(res) || await getRequestIdFromErrorBody(res)
            throw new Error(appendRequestId(`API error: ${res.status}`, requestId))
        }

        if (options?.responseType === 'blob') {
            return await res.blob() as unknown as T
        }
        return await res.json()
    } catch (err: unknown) {
        clearTimeout(timeoutId)
        if (err instanceof Error && err.name === 'AbortError') {
            throw new Error('Request timed out. Please try again.')
        }
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
    onDone: (data: unknown) => void,
    onError: (err: unknown) => void,
    signal?: AbortSignal,
    onStatus?: (status: StreamStatus) => void
) {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'X-Request-ID': createRequestId(),
    }

    let retries = 0
    const maxRetries = 2

    const fallbackToNonStream = async (reason: string): Promise<void> => {
        try {
            onStatus?.('fallback')
            if (IS_DEV) {
                console.warn('Streaming unavailable, falling back to non-stream response:', reason)
            }
            const data = await queryTopic(req)
            const preferredLevel = req.levels?.[0]
            const levelKey = preferredLevel && data.explanations?.[preferredLevel]
                ? preferredLevel
                : Object.keys(data.explanations || {})[0]
            const fullText = levelKey ? data.explanations[levelKey] : ''
            if (fullText) onChunk(fullText)
            onDone(data)
        } catch (err) {
            onError(err)
        }
    }

    const attemptStream = async (): Promise<void> => {
        try {
            const response = await fetch(`${API_URL}/api/query/stream`, {
                method: 'POST',
                headers,
                body: JSON.stringify(req),
                signal,
            })

            if (response.status === 429) {
                let detail = 'Too many requests. Please try again later.'
                try {
                    const body = await response.json()
                    const message = body?.detail?.message || body?.detail
                    if (typeof message === 'string') detail = message
                    const bodyRequestId = typeof body?.request_id === 'string' ? body.request_id : null
                    detail = appendRequestId(detail, bodyRequestId || getRequestIdFromResponse(response))
                } catch {
                    // ignore
                    detail = appendRequestId(detail, getRequestIdFromResponse(response))
                }
                throw new Error(detail)
            }

            if (!response.ok) {
                const requestId = getRequestIdFromResponse(response) || await getRequestIdFromErrorBody(response)
                throw new Error(appendRequestId(`API error: ${response.status}`, requestId))
            }

            const contentType = response.headers.get('content-type')
            if (!contentType?.includes('text/event-stream')) {
                onStatus?.('degraded')
                return fallbackToNonStream(`Invalid content-type: ${contentType || 'unknown'}`)
            }
            onStatus?.('live')

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()
            if (!reader) return fallbackToNonStream('ReadableStream not supported')

            let buffer = ''
            const READ_TIMEOUT_MS = 20000

            while (true) {
                const { done, value } = await Promise.race([
                    reader.read(),
                    new Promise<ReadableStreamReadResult<Uint8Array>>((_, reject) =>
                        setTimeout(() => reject(new Error('Stream read timed out')), READ_TIMEOUT_MS)
                    )
                ])
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue
                    const data = line.slice(6).trim()
                    if (data === '[DONE]') {
                        onDone({})
                        return
                    }
                    try {
                        const parsed = JSON.parse(data)
                        if (parsed.chunk) onChunk(parsed.chunk)
                        else if (parsed.warning) onChunk(`\n\n${parsed.warning}`)
                        else if (parsed.error) {
                            onError(new Error(parsed.error))
                            return
                        }
                    } catch (e) {
                        if (IS_DEV) {
                            console.warn('Failed to parse SSE chunk:', data.substring(0, 100), e)
                        }
                    }
                }
            }
        } catch (err: unknown) {
            if (err instanceof Error && err.name === 'AbortError') return

            if (err instanceof Error && err.message === 'Stream read timed out') {
                try {
                    onStatus?.('degraded')
                    return await fallbackToNonStream(err.message)
                } catch {
                    // continue to retry/error flow
                }
            }

            if (retries < maxRetries && !signal?.aborted) {
                retries++
                await new Promise(r => setTimeout(r, 1000 * retries))
                return attemptStream()
            }

            await fallbackToNonStream(err instanceof Error ? err.message : 'Stream failed')
        }
    }

    await attemptStream()
}

