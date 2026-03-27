import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useKnowBearStore } from './useKnowBearStore'
import { responseCache } from '../lib/responseCache'

type CachedResponse = NonNullable<ReturnType<typeof responseCache.get>>

vi.mock('../api', () => ({
    queryTopicStream: vi.fn((_req, onChunk, onDone) => {
        setTimeout(() => {
            onChunk('Test content')
            onDone({})
        }, 20)
        return Promise.resolve()
    }),
}))

vi.mock('../lib/responseCache', () => ({
    responseCache: {
        get: vi.fn(),
        set: vi.fn(),
        clear: vi.fn(),
        getStats: vi.fn(() => ({ count: 0, size: 0, compressionRatio: '0%' })),
    },
}))

describe('useKnowBearStore', () => {
    beforeEach(() => {
        const { result } = renderHook(() => useKnowBearStore())
        act(() => {
            result.current.reset()
        })
        vi.clearAllMocks()
    })

    it('has expected initial state', () => {
        const { result } = renderHook(() => useKnowBearStore())
        expect(result.current.loading).toBe(false)
        expect(result.current.result).toBeNull()
        expect(result.current.mode).toBe('fast')
    })

    it('loads cached result in startSearch', async () => {
        const cached: CachedResponse = {
            topic: 'blockchain',
            mode: 'fast',
            explanations: { eli5: 'Cached content' },
            timestamp: Date.now(),
        }
        vi.mocked(responseCache.get).mockReturnValue(cached)

        const { result } = renderHook(() => useKnowBearStore())
        await act(async () => {
            await result.current.startSearch('blockchain')
        })

        expect(result.current.result?.cached).toBe(true)
        expect(result.current.result?.explanations.eli5).toBe('Cached content')
    })

    it('streams and caches fetched level', async () => {
        vi.mocked(responseCache.get).mockReturnValue(null)

        const { result } = renderHook(() => useKnowBearStore())
        await act(async () => {
            await result.current.startSearch('blockchain')
        })

        await waitFor(() => {
            expect(responseCache.set).toHaveBeenCalled()
        })
        expect(result.current.result?.topic).toBe('blockchain')
    })
})
