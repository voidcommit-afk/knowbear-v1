import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCcw } from 'lucide-react'
import type { Level, Mode } from '../types'
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
    const loadingMeta = useKnowBearStore((state) => state.loadingMeta)
    const modeSwitching = useKnowBearStore((state) => state.modeSwitching)

    const setSelectedLevel = useKnowBearStore((state) => state.setSelectedLevel)
    const setMode = useKnowBearStore((state) => state.setMode)
    const setIsSidebarOpen = useKnowBearStore((state) => state.setIsSidebarOpen)
    const setModeSwitching = useKnowBearStore((state) => state.setModeSwitching)
    const setResult = useKnowBearStore((state) => state.setResult)
    const setFetchingLevels = useKnowBearStore((state) => state.setFetchingLevels)
    const startSearch = useKnowBearStore((state) => state.startSearch)
    const fetchLevel = useKnowBearStore((state) => state.fetchLevel)
    const abortCurrentStream = useKnowBearStore((state) => state.abortCurrentStream)
    
    const pinnedTopics = useKnowBearStore((state) => state.pinnedTopics)
    const fetchPinnedTopics = useKnowBearStore((state) => state.fetchPinnedTopics)

    useEffect(() => {
        fetchPinnedTopics()
    }, [fetchPinnedTopics])

    const handleSearch = useCallback(
        async (topic: string, forceRefresh = false, requestedMode?: Mode, requestedLevel?: Level) => {
            await startSearch(topic, forceRefresh, requestedMode, requestedLevel)
        },
        [startSearch]
    )

    useEffect(() => {
        if (activeTopic && !loading && result && result.mode !== mode && !loadingMeta) {
            setModeSwitching(true)
            abortCurrentStream()
            setResult(null)
            setFetchingLevels(new Set())
            handleSearch(activeTopic, false, mode).finally(() => setModeSwitching(false))
        }
    }, [
        mode,
        activeTopic,
        loading,
        result,
        loadingMeta,
        abortCurrentStream,
        handleSearch,
        setFetchingLevels,
        setModeSwitching,
        setResult,
    ])

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
                    <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
                        <div className="space-y-4">
                            <SearchBar onSearch={(topic) => handleSearch(topic, false)} loading={loading} mode={mode} onModeChange={setMode} />

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
                                            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight break-words">{result.topic}</h2>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Mode: <span className="text-cyan-400 font-medium">{mode}</span>
                                            </p>
                                        </div>

                                        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
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
                                    {pinnedTopics.length > 0 && (
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
