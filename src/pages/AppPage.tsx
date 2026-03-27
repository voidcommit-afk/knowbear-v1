import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCcw } from 'lucide-react'
import type { Level, Mode, PinnedTopic } from '../types'
import { getPinnedTopics } from '../api'
import { responseCache } from '../lib/responseCache'
import SearchBar from '../components/SearchBar'
import LevelDropdown from '../components/LevelDropdown'
import ExplanationCard from '../components/ExplanationCard'
import ExportDropdown from '../components/ExportDropdown'
import Sidebar from '../components/Sidebar'
import MobileBottomNav from '../components/MobileBottomNav'
import { LoadingState } from '../components/LoadingState'
import PinnedTopics from '../components/PinnedTopics'
import { useKnowBearStore } from '../store/useKnowBearStore'

export default function AppPage() {
    const loading = useKnowBearStore((state) => state.loading)
    const result = useKnowBearStore((state) => state.result)
    const selectedLevel = useKnowBearStore((state) => state.selectedLevel)
    const error = useKnowBearStore((state) => state.error)
    const mode = useKnowBearStore((state) => state.mode)
    const fetchingLevels = useKnowBearStore((state) => state.fetchingLevels)
    const failedLevels = useKnowBearStore((state) => state.failedLevels)
    const isSidebarOpen = useKnowBearStore((state) => state.isSidebarOpen)
    const activeTopic = useKnowBearStore((state) => state.activeTopic)
    const isFromCache = useKnowBearStore((state) => state.isFromCache)
    const loadingMeta = useKnowBearStore((state) => state.loadingMeta)
    const modeSwitching = useKnowBearStore((state) => state.modeSwitching)

    const setSelectedLevel = useKnowBearStore((state) => state.setSelectedLevel)
    const setMode = useKnowBearStore((state) => state.setMode)
    const setIsSidebarOpen = useKnowBearStore((state) => state.setIsSidebarOpen)
    const setModeSwitching = useKnowBearStore((state) => state.setModeSwitching)
    const setResult = useKnowBearStore((state) => state.setResult)
    const setFetchingLevels = useKnowBearStore((state) => state.setFetchingLevels)
    const setIsFromCache = useKnowBearStore((state) => state.setIsFromCache)
    const startSearch = useKnowBearStore((state) => state.startSearch)
    const fetchLevel = useKnowBearStore((state) => state.fetchLevel)
    const abortCurrentStream = useKnowBearStore((state) => state.abortCurrentStream)

    const [pinnedTopics, setPinnedTopics] = useState<PinnedTopic[]>([])
    const [loadingPinned, setLoadingPinned] = useState(true)

    useEffect(() => {
        responseCache.pruneInvalidModes(['fast', 'ensemble'])
        const timer = setTimeout(() => {
            getPinnedTopics()
                .then((topics) => setPinnedTopics(topics))
                .catch((err) => console.error('Failed to load pinned topics:', err))
                .finally(() => setLoadingPinned(false))
        }, 100)

        return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
        if (activeTopic && !loading && result && result.mode !== mode && !loadingMeta) {
            setModeSwitching(true)
            abortCurrentStream()

            const cached = responseCache.get(activeTopic, mode)
            if (cached) {
                setResult(null)
                setFetchingLevels(new Set())
                setTimeout(() => {
                    setResult({ topic: activeTopic, explanations: cached.explanations, cached: true, mode })
                    setIsFromCache(true)
                    setModeSwitching(false)
                    setTimeout(() => setIsFromCache(false), 3000)
                }, 50)
            } else {
                setResult(null)
                setFetchingLevels(new Set())
                handleSearch(activeTopic, false, mode).finally(() => setModeSwitching(false))
            }
        }
    }, [mode, activeTopic, loading, result, loadingMeta])

    const handleSearch = async (topic: string, forceRefresh = false, requestedMode?: Mode, requestedLevel?: Level) => {
        await startSearch(topic, forceRefresh, requestedMode, requestedLevel)
    }

    const handleLevelClick = async (level: Level) => {
        if (!result) return

        const currentExplanation = result.explanations[level]
        if (currentExplanation && !fetchingLevels.has(level) && !failedLevels.has(level)) {
            setSelectedLevel(level)
            return
        }

        setSelectedLevel(level)

        if (!currentExplanation && !fetchingLevels.has(level)) {
            await fetchLevel(result.topic, level, mode)
        }
    }

    const handleRegenerate = async () => {
        if (!result || !activeTopic) return
        await handleSearch(activeTopic, true, mode, selectedLevel)
    }

    return (
        <div className="flex h-screen bg-dark-900 text-white overflow-hidden">
            <Sidebar
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                onSelectTopic={(topic) => handleSearch(topic, false)}
            />

            <main className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
                        <div className="space-y-4">
                            <SearchBar onSearch={(topic) => handleSearch(topic, false)} loading={loading} mode={mode} onModeChange={setMode} />

                            {isFromCache && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center gap-2 text-sm text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-4 py-2"
                                >
                                    <span className="font-mono">⚡</span>
                                    <span>Loaded from cache</span>
                                </motion.div>
                            )}

                            {modeSwitching && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-2 text-sm text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-lg px-4 py-2"
                                >
                                    <RefreshCcw className="w-4 h-4 animate-spin" />
                                    <span>Switching mode...</span>
                                </motion.div>
                            )}

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400"
                                >
                                    {error}
                                </motion.div>
                            )}
                        </div>

                        <AnimatePresence mode="wait">
                            {loading && loadingMeta ? (
                                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <LoadingState mode={loadingMeta.mode} level={loadingMeta.level} topic={loadingMeta.topic} />
                                </motion.div>
                            ) : result ? (
                                <motion.section
                                    key={`result-${result.topic}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                    className="space-y-6"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div>
                                            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{result.topic}</h2>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Mode: <span className="text-cyan-400 font-medium">{mode}</span>
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <LevelDropdown selected={selectedLevel} onChange={handleLevelClick} />
                                            <ExportDropdown topic={result.topic} explanations={result.explanations} mode={mode} />
                                        </div>
                                    </div>

                                    <ExplanationCard
                                        level={selectedLevel}
                                        content={result.explanations[selectedLevel] || ''}
                                        streaming={fetchingLevels.has(selectedLevel)}
                                    />
                                </motion.section>
                            ) : (
                                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                                    <p className="text-gray-600 text-lg mb-8">Search for a topic to get started</p>
                                    {!loadingPinned && pinnedTopics.length > 0 && (
                                        <PinnedTopics topics={pinnedTopics} onSelect={(topic) => handleSearch(topic, false)} />
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <MobileBottomNav
                    onRegenerate={handleRegenerate}
                    topic={activeTopic}
                    explanations={result?.explanations || {}}
                    loading={loading}
                    hasResult={!!result}
                    isSidebarOpen={isSidebarOpen}
                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    mode={mode}
                />
            </main>
        </div>
    )
}
