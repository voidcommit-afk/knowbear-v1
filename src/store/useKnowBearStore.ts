import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { QueryResponse, Mode, Level } from '../types'
import { queryTopicStream } from '../api'
import { responseCache } from '../lib/responseCache'

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
    isFromCache: boolean
    loadingMeta: { mode: Mode; level: Level; topic: string } | null
    modeSwitching: boolean
    abortController: AbortController | null

    setLoading: (loading: boolean) => void
    setResult: (result: QueryResponse | null) => void
    setSelectedLevel: (level: Level) => void
    setError: (error: string | null) => void
    setMode: (mode: Mode) => void
    setFetchingLevels: (levels: Set<Level>) => void
    setFailedLevels: (levels: Set<Level>) => void
    setIsSidebarOpen: (open: boolean) => void
    setActiveTopic: (topic: string) => void
    setIsFromCache: (fromCache: boolean) => void
    setLoadingMeta: (meta: { mode: Mode; level: Level; topic: string } | null) => void
    setModeSwitching: (switching: boolean) => void

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
    isFromCache: false,
    loadingMeta: null,
    modeSwitching: false,
    abortController: null,
}

export const useKnowBearStore = create<KnowBearState>()(
    persist(
        (set, get) => ({
            ...initialState,

            setLoading: (loading) => set({ loading }),
            setResult: (result) => set({ result }),
            setSelectedLevel: (selectedLevel) => set({ selectedLevel }),
            setError: (error) => set({ error }),
            setMode: (mode) => set({ mode }),
            setFetchingLevels: (fetchingLevels) => set({ fetchingLevels }),
            setFailedLevels: (failedLevels) => set({ failedLevels }),
            setIsSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
            setActiveTopic: (activeTopic) => set({ activeTopic }),
            setIsFromCache: (isFromCache) => set({ isFromCache }),
            setLoadingMeta: (loadingMeta) => set({ loadingMeta }),
            setModeSwitching: (modeSwitching) => set({ modeSwitching }),

            abortCurrentStream: () => {
                const { abortController } = get()
                if (abortController) abortController.abort()
                const newController = new AbortController()
                set({ abortController: newController })
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

                    await queryTopicStream(
                        {
                            topic,
                            levels: [level],
                            mode,
                            temperature: options?.temperature,
                            regenerate: options?.regenerate || false,
                            bypass_cache: options?.regenerate || false,
                        },
                        (chunk: string) => {
                            streamedText += chunk
                            const currentResult = get().result
                            if (currentResult) {
                                set({
                                    result: {
                                        ...currentResult,
                                        explanations: {
                                            ...currentResult.explanations,
                                            [level]: streamedText,
                                        },
                                    },
                                })
                            }
                        },
                        () => {
                            const finalResult = get().result
                            if (finalResult?.explanations) {
                                responseCache.set(topic, mode, finalResult.explanations)
                            }
                        },
                        (error: unknown) => {
                            const failed = new Set(get().failedLevels)
                            failed.add(level)
                            const message = error instanceof Error ? error.message : 'Request failed'
                            set({ failedLevels: failed, error: message })
                        },
                        controller.signal
                    )
                } catch (err: unknown) {
                    if (!(err instanceof Error) || err.name !== 'AbortError') {
                        const failed = new Set(get().failedLevels)
                        failed.add(level)
                        set({ failedLevels: failed, error: err instanceof Error ? err.message : 'Request failed' })
                    }
                } finally {
                    const remaining = new Set(get().fetchingLevels)
                    remaining.delete(level)
                    set({ fetchingLevels: remaining })
                }
            },

            startSearch: async (topic: string, forceRefresh = false, requestedMode?: Mode, requestedLevel?: Level) => {
                if (!topic.trim()) return

                const state = get()
                state.abortCurrentStream()

                const effectiveMode = requestedMode || state.mode
                const activeLevel = requestedLevel || state.selectedLevel

                if (!forceRefresh) {
                    set({ result: null, error: null })
                }

                if (requestedMode && requestedMode !== state.mode) set({ mode: requestedMode })
                if (requestedLevel && requestedLevel !== state.selectedLevel) set({ selectedLevel: activeLevel })

                if (!forceRefresh) {
                    const cached = responseCache.get(topic, effectiveMode)
                    if (cached) {
                        set({
                            result: { topic, explanations: cached.explanations, cached: true, mode: effectiveMode },
                            activeTopic: topic,
                            isFromCache: true,
                            loading: false,
                            error: null,
                            fetchingLevels: new Set(),
                        })

                        if (!cached.explanations[activeLevel]) {
                            const availableLevel = Object.keys(cached.explanations)[0] as Level
                            if (availableLevel) set({ selectedLevel: availableLevel })
                        }

                        setTimeout(() => set({ isFromCache: false }), 3000)
                        return
                    }
                }

                set({
                    activeTopic: topic,
                    loadingMeta: { mode: effectiveMode, level: activeLevel, topic },
                    loading: true,
                    isFromCache: false,
                    error: null,
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
                    result: { topic, explanations: {}, mode: effectiveMode, cached: false },
                    fetchingLevels: new Set(),
                    failedLevels: new Set(),
                })

                await get().fetchLevel(topic, activeLevel, effectiveMode)
                set({ loading: false, loadingMeta: null })
            },

            reset: () => set(initialState),
        }),
        {
            name: 'knowbear-store',
            partialize: (state) => ({
                selectedLevel: state.selectedLevel,
                mode: state.mode,
                isSidebarOpen: state.isSidebarOpen,
            }),
        }
    )
)
