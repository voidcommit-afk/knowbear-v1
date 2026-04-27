import { create } from 'zustand'
import type { QueryResponse, Mode, Level, PinnedTopic, StreamStatus } from '../types'
import { queryTopicStream } from '../api'

const FAVORITES_KEY = 'knowbear-favorite-topics'
const MAX_TOPIC_HISTORY = 12

function loadStringArray(key: string): string[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = window.localStorage.getItem(key)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
    } catch {
        return []
    }
}

function saveStringArray(key: string, values: string[]): void {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(key, JSON.stringify(values))
    } catch {
        // no-op
    }
}

interface KnowBearState {
    loading: boolean
    result: QueryResponse | null
    selectedLevel: Level
    error: string | null
    mode: Mode
    fetchingLevels: Set<Level>
    failedLevels: Set<Level>
    isSidebarOpen: boolean
    activeTopic: string
    loadingMeta: { mode: Mode; level: Level; topic: string } | null
    modeSwitching: boolean
    abortController: AbortController | null
    pinnedTopics: PinnedTopic[]
    pinnedTopicsLoaded: boolean
    streamStatus: StreamStatus
    favoriteTopics: string[]
    lastFailedRequest: { topic: string; mode: Mode; level: Level } | null

    setLoading: (loading: boolean) => void
    setResult: (result: QueryResponse | null) => void
    setSelectedLevel: (level: Level) => void
    setError: (error: string | null) => void
    setMode: (mode: Mode) => void
    setFetchingLevels: (levels: Set<Level>) => void
    setFailedLevels: (levels: Set<Level>) => void
    setIsSidebarOpen: (open: boolean) => void
    setActiveTopic: (topic: string) => void
    setLoadingMeta: (meta: { mode: Mode; level: Level; topic: string } | null) => void
    setModeSwitching: (switching: boolean) => void
    setStreamStatus: (status: StreamStatus) => void
    toggleFavoriteTopic: (topic: string) => void
    fetchPinnedTopics: () => Promise<void>
    retryLastFailed: () => Promise<void>

    startSearch: (topic: string, forceRefresh?: boolean, requestedMode?: Mode, requestedLevel?: Level) => Promise<void>
    fetchLevel: (topic: string, level: Level, mode: Mode, options?: { temperature?: number; regenerate?: boolean }) => Promise<void>
    abortCurrentStream: () => void
    reset: () => void
}

const initialState = {
    loading: false,
    result: null,
    selectedLevel: 'eli5' as Level,
    error: null,
    mode: 'fast' as Mode,
    fetchingLevels: new Set<Level>(),
    failedLevels: new Set<Level>(),
    isSidebarOpen: true,
    activeTopic: '',
    loadingMeta: null,
    modeSwitching: false,
    abortController: null,
    pinnedTopics: [],
    pinnedTopicsLoaded: false,
    streamStatus: 'idle' as StreamStatus,
    favoriteTopics: [],
    lastFailedRequest: null,
}

export const useKnowBearStore = create<KnowBearState>()((set, get) => ({
    ...initialState,
    favoriteTopics: loadStringArray(FAVORITES_KEY),

    setLoading: (loading) => set({ loading }),
    setResult: (result) => set({ result }),
    setSelectedLevel: (selectedLevel) => set({ selectedLevel }),
    setError: (error) => set({ error }),
    setMode: (mode) => set({ mode }),
    setFetchingLevels: (fetchingLevels) => set({ fetchingLevels }),
    setFailedLevels: (failedLevels) => set({ failedLevels }),
    setIsSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
    setActiveTopic: (activeTopic) => set({ activeTopic }),
    setLoadingMeta: (loadingMeta) => set({ loadingMeta }),
    setModeSwitching: (modeSwitching) => set({ modeSwitching }),
    setStreamStatus: (streamStatus) => set({ streamStatus }),
    toggleFavoriteTopic: (topic) => {
        const cleanTopic = topic.trim()
        if (!cleanTopic) return
        const current = get().favoriteTopics
        const exists = current.some((item) => item.toLowerCase() === cleanTopic.toLowerCase())
        const next = exists
            ? current.filter((item) => item.toLowerCase() !== cleanTopic.toLowerCase())
            : [cleanTopic, ...current].slice(0, MAX_TOPIC_HISTORY)
        saveStringArray(FAVORITES_KEY, next)
        set({ favoriteTopics: next })
    },

    abortCurrentStream: () => {
        const { abortController } = get()
        if (abortController) abortController.abort()
        const newController = new AbortController()
        set({ abortController: newController })
    },

    fetchPinnedTopics: async () => {
        if (get().pinnedTopicsLoaded) return
        try {
            const { getPinnedTopics } = await import('../api')
            const topics = await getPinnedTopics()
            set({ pinnedTopics: topics, pinnedTopicsLoaded: true })
        } catch (err) {
            console.error('Failed to load pinned topics:', err)
            // Even if it fails, maybe we mark it loaded to avoid infinite retries, or leave it false
            set({ pinnedTopicsLoaded: true })
        }
    },

    fetchLevel: async (topic: string, level: Level, mode: Mode, options?: { temperature?: number; regenerate?: boolean }) => {
        const state = get()
        const newFetching = new Set(state.fetchingLevels)
        newFetching.add(level)
        set({ fetchingLevels: newFetching })

        const controller = state.abortController || new AbortController()
        if (!state.abortController) set({ abortController: controller })

        try {
            let streamedText = ''
            set({ streamStatus: 'idle' })

            await queryTopicStream(
                {
                    topic,
                    levels: [level],
                    mode,
                    temperature: options?.temperature,
                    regenerate: options?.regenerate || false,
                },
                (chunk: string) => {
                    streamedText += chunk
                    const currentState = get()
                    if (!currentState.result) {
                        controller.abort()
                        return
                    }

                    set({
                        result: {
                            ...currentState.result,
                            explanations: {
                                ...currentState.result.explanations,
                                [level]: streamedText,
                            },
                        },
                    })
                },
                () => undefined,
                (error: unknown) => {
                    const failed = new Set(get().failedLevels)
                    failed.add(level)
                    const message = error instanceof Error ? error.message : 'Request failed'
                    set({
                        failedLevels: failed,
                        error: message,
                        streamStatus: 'degraded',
                        lastFailedRequest: { topic, mode, level },
                    })
                },
                controller.signal,
                (status) => {
                    set({ streamStatus: status })
                }
            )
        } catch (err: unknown) {
            if (!(err instanceof Error) || err.name !== 'AbortError') {
                const failed = new Set(get().failedLevels)
                failed.add(level)
                set({
                    failedLevels: failed,
                    error: err instanceof Error ? err.message : 'Request failed',
                    streamStatus: 'degraded',
                    lastFailedRequest: { topic, mode, level },
                })
            }
        } finally {
            const remaining = new Set(get().fetchingLevels)
            remaining.delete(level)
            if (remaining.size === 0 && get().streamStatus === 'live') {
                set({ fetchingLevels: remaining, streamStatus: 'idle' })
            } else {
                set({ fetchingLevels: remaining })
            }
        }
    },

    startSearch: async (topic: string, forceRefresh = false, requestedMode?: Mode, requestedLevel?: Level) => {
        if (!topic.trim()) return

        const state = get()
        state.abortCurrentStream()

        const effectiveMode = requestedMode || state.mode
        const activeLevel = requestedLevel || state.selectedLevel

        if (!forceRefresh) {
            set({ result: null, error: null, lastFailedRequest: null })
        }

        if (requestedMode && requestedMode !== state.mode) set({ mode: requestedMode })
        if (requestedLevel && requestedLevel !== state.selectedLevel) set({ selectedLevel: activeLevel })

        set({
            activeTopic: topic,
            loadingMeta: { mode: effectiveMode, level: activeLevel, topic },
            loading: true,
            error: null,
            streamStatus: 'idle',
        })

        if (forceRefresh) {
            const currentResult = get().result
            if (currentResult) {
                set({
                    result: {
                        ...currentResult,
                        explanations: { ...currentResult.explanations, [activeLevel]: '' },
                    },
                })
            } else {
                set({
                    result: { topic, explanations: {}, mode: effectiveMode },
                })
            }

            const randomTemp = Math.random() * (1.1 - 0.95) + 0.95
            set({ fetchingLevels: new Set(), failedLevels: new Set() })

            await get().fetchLevel(topic, activeLevel, effectiveMode, {
                temperature: randomTemp,
                regenerate: true,
            })
            set({ loading: false, loadingMeta: null })
            return
        }

        set({
            result: { topic, explanations: {}, mode: effectiveMode },
            fetchingLevels: new Set(),
            failedLevels: new Set(),
        })

        await get().fetchLevel(topic, activeLevel, effectiveMode)
        set({ loading: false, loadingMeta: null })
    },

    retryLastFailed: async () => {
        const failed = get().lastFailedRequest
        if (!failed) return
        await get().startSearch(failed.topic, true, failed.mode, failed.level)
    },

    reset: () => set(initialState),
}))
