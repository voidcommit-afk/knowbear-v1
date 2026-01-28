import { useState, useCallback, useRef, useEffect } from 'react'
import { queryTopicStream } from '../api'
import type { QueryResponse, Level, Mode } from '../types'
import SearchBar from '../components/SearchBar'
import LevelDropdown from '../components/LevelDropdown'
import ExplanationCard from '../components/ExplanationCard'
import ExportDropdown from '../components/ExportDropdown'
import { useUsageGate } from '../hooks/useUsageGate'
import { UpgradeModal } from '../components/UpgradeModal'
import { RefreshCcw } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import MobileBottomNav from '../components/MobileBottomNav'
import { LoadingState } from '../components/LoadingState'
import { useMode } from '../context/ModeContext'
import { motion, AnimatePresence } from 'framer-motion'

// Global cache to persist across internal navigation (cleared on tab refresh)
const responseCacheSession = new Map<string, any>()

export default function AppPage() {
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<QueryResponse | null>(null)
    const [selectedLevel, setSelectedLevel] = useState<Level>('eli5')
    const [error, setError] = useState<string | null>(null)
    const { mode, setMode } = useMode()
    const [fetchingLevels, setFetchingLevels] = useState<Set<Level>>(new Set())
    const [failedLevels, setFailedLevels] = useState<Set<Level>>(new Set())
    const [historyRefresh, setHistoryRefresh] = useState(0)
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [activeTopic, setActiveTopic] = useState('')
    const [isFromCache, setIsFromCache] = useState(false)
    const [loadingMeta, setLoadingMeta] = useState<{ mode: Mode, level: Level, topic: string } | null>(null)

    const { checkAction, recordAction, showPremiumModal, setShowPremiumModal } = useUsageGate()

    // Use a ref to track current search topic and abort controller to avoid race conditions
    const currentTopicRef = useRef<string | null>(null)
    const abortControllerRef = useRef<AbortController | null>(null)


    const fetchLevel = useCallback(async (topic: string, level: Level, overrideMode?: Mode, options?: { temperature?: number, regenerate?: boolean }) => {
        if (!topic) return
        setFetchingLevels(prev => new Set(prev).add(level))
        const activeMode = overrideMode || mode

        let accumulatedContent = ''

        try {
            await queryTopicStream(
                {
                    topic,
                    levels: [level],
                    mode: activeMode,
                    premium: localStorage.getItem('knowbear_pro_status') === 'true',
                    bypass_cache: options?.regenerate,
                    temperature: options?.temperature,
                    regenerate: options?.regenerate
                },
                (chunk) => {
                    accumulatedContent += chunk
                    if (currentTopicRef.current === topic) {
                        setResult(prev => {
                            if (!prev || prev.topic !== topic) {
                                return {
                                    topic,
                                    explanations: { [level]: accumulatedContent },
                                    cached: false,
                                    mode: activeMode
                                }
                            }
                            return {
                                ...prev,
                                explanations: { ...prev.explanations, [level]: accumulatedContent },
                                mode: activeMode
                            }
                        })
                    }
                },
                () => {
                    setFetchingLevels(prev => {
                        const next = new Set(prev)
                        next.delete(level)
                        return next
                    })
                    // Add delay to allow backend background task to finish saving history
                    setTimeout(() => {
                        setHistoryRefresh(prev => prev + 1)
                    }, 1500)
                },
                (err) => {
                    if (err.name === 'AbortError') return
                    console.error(`Failed to stream ${level}:`, err)
                    setFailedLevels(prev => new Set(prev).add(level))
                    setFetchingLevels(prev => {
                        const next = new Set(prev)
                        next.delete(level)
                        return next
                    })
                },
                abortControllerRef.current?.signal
            )
        } catch (err: any) {
            if (err.name === 'AbortError') return
            console.error(`Failed to start stream for ${level}:`, err)
            setFailedLevels(prev => new Set(prev).add(level))
            setFetchingLevels(prev => {
                const next = new Set(prev)
                next.delete(level)
                return next
            })
        }
    }, [mode])

    useEffect(() => {
        // Only cache if the result mode matches the current UI mode to avoid stale data caching
        if (result && !loading && fetchingLevels.size === 0 && result.mode === mode) {
            const cacheKey = `${result.topic}:${mode}`
            responseCacheSession.set(cacheKey, { ...result })
        }
    }, [result, loading, fetchingLevels, mode])

    const handleSearch = useCallback(async (topic: string, _forceRefresh: boolean = false, requestedMode?: Mode, requestedLevel?: Level) => {
        if (!topic.trim()) return;

        // Abort previous request immediately
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        abortControllerRef.current = new AbortController()

        // Restore mode/level if provided (e.g. from history)
        const activeMode = requestedMode || mode
        const activeLevel = requestedLevel || (activeMode === 'technical_depth' ? 'eli5' : selectedLevel)

        // Clear state immediately for fresh feel
        if (!_forceRefresh) {
            setResult(null)
            setError(null)
        }

        // Sync visual mode indicators immediately
        if (requestedMode && requestedMode !== mode) setMode(requestedMode)
        if (requestedLevel && requestedLevel !== selectedLevel) setSelectedLevel(activeLevel)

        // Usage gate check (uses activeMode)
        const { allowed: searchAllowed, downgraded } = checkAction('search', activeMode)

        if (!searchAllowed) {
            return
        }

        // Gating for Premium Modes
        if (activeMode === 'ensemble' || activeMode === 'technical_depth') {
            const { allowed } = checkAction('premium_mode')
            if (!allowed) return
        }

        // Determine actual mode to use
        const effectiveMode = downgraded ? 'fast' : activeMode
        if (downgraded) setMode('fast')

        // Check Cache first
        if (!_forceRefresh) {
            const cacheKey = `${topic}:${effectiveMode}`
            const cachedResponse = responseCacheSession.get(cacheKey)
            if (cachedResponse) {
                console.log('Cache hit for', topic)
                setResult(cachedResponse)
                setActiveTopic(topic)
                setIsFromCache(true)

                // If the cached response has a different mode, sync it
                if (cachedResponse.mode && cachedResponse.mode !== mode) setMode(cachedResponse.mode)

                // Try to find a level in the cached explanations if the current activeLevel isn't there
                if (!cachedResponse.explanations[activeLevel]) {
                    const availableLevel = Object.keys(cachedResponse.explanations)[0] as Level
                    if (availableLevel) setSelectedLevel(availableLevel)
                }

                // Clear any previous error/loading
                setError(null)
                setLoading(false)
                setFetchingLevels(new Set())
                // Hide cache indicator after a few seconds
                setTimeout(() => setIsFromCache(false), 3000)
                return
            }
        }

        recordAction('search', effectiveMode)

        setActiveTopic(topic)
        setLoadingMeta({ mode: effectiveMode, level: activeLevel, topic })
        setLoading(true)
        setIsFromCache(false)
        setError(null)

        // If regenerating, we keep the previous result but will overwrite the active level
        if (_forceRefresh) {
            // Regeneration specific: Clear current level to trigger LoadingState
            setResult(prev => prev ? {
                ...prev,
                explanations: { ...prev.explanations, [activeLevel]: '' }
            } : null)

            // Regeneration specific: Increase temperature to 0.95–1.1
            const randomTemp = Math.random() * (1.1 - 0.95) + 0.95
            setFetchingLevels(new Set())
            setFailedLevels(new Set())
            currentTopicRef.current = topic
            await fetchLevel(topic, activeLevel, effectiveMode, {
                temperature: randomTemp,
                regenerate: true
            })
            setLoading(false)
            setLoadingMeta(null)
            return
        }

        setFetchingLevels(new Set())
        setFailedLevels(new Set())
        currentTopicRef.current = topic

        // Use fetchLevel which now handles streaming and mode override
        await fetchLevel(topic, activeLevel, effectiveMode)
        setLoading(false)
        setLoadingMeta(null)
    }, [mode, setMode, selectedLevel, fetchLevel, checkAction, recordAction])

    // Mid-conversation mode switch detection
    useEffect(() => {
        // Trigger a new search if:
        // 1. We have an active topic.
        // 2. We aren't currently loading.
        // 3. The current UI mode differs from the mode used to generate the current result.
        // 4. We aren't already in the middle of a transition.
        if (activeTopic && !loading && result && result.mode !== mode && !loadingMeta) {
            const cacheKey = `${activeTopic}:${mode}`
            const cachedResponse = responseCacheSession.get(cacheKey)

            if (cachedResponse) {
                console.log('Switching to cached result for mode', mode)
                setResult(cachedResponse)
                setIsFromCache(true)
                setTimeout(() => setIsFromCache(false), 3000)
            } else {
                console.log('Mode changed, triggering fresh search for', activeTopic)
                handleSearch(activeTopic, false, mode)
            }
        }
    }, [mode, activeTopic, loading, result, loadingMeta, handleSearch])

    const handleGoHome = useCallback(() => {
        setResult(null)
        setError(null)
        setLoading(false)
        setActiveTopic('')
        currentTopicRef.current = null
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }, [])

    // Fetch level when user switches and it's missing
    useEffect(() => {
        if (result &&
            !result.explanations[selectedLevel] &&
            !fetchingLevels.has(selectedLevel) &&
            !failedLevels.has(selectedLevel)
        ) {
            fetchLevel(result.topic, selectedLevel)
        }
    }, [selectedLevel, result, fetchingLevels, failedLevels, fetchLevel])

    // Track if mobile for sidebar default state
    useEffect(() => {
        if (window.innerWidth <= 768) {
            setIsSidebarOpen(false)
        }
    }, [setIsSidebarOpen])

    return (
        <div className="flex min-h-screen bg-black overflow-hidden relative">
            <Sidebar
                onSelectTopic={(topic: string, mode?: Mode, level?: Level) => { handleSearch(topic, false, mode, level) }}
                refreshTrigger={historyRefresh}
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            {/* Main Content Area */}
            <div className={`flex-1 min-w-0 flex flex-col relative transition-all duration-300 md:pl-0 ${isSidebarOpen ? 'md:pl-64' : 'md:pl-16'}`}>
                {/* Starry Background */}
                <div className="stars"></div>
                <div className="stars stars-2"></div>

                {/* Content Container */}
                <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col min-h-[90vh] py-8 px-4 md:px-8 pb-32 md:pb-8">

                    <header className="text-center mb-12 mt-10 flex flex-col items-center">
                        <button
                            onClick={handleGoHome}
                            className="group flex flex-col md:flex-row items-center gap-3 transition-transform hover:scale-105 active:scale-95 focus:outline-none cursor-pointer"
                            aria-label="KnowBear Home"
                        >
                            <h1 className="text-4xl md:text-5xl font-bold text-white flex flex-col md:flex-row items-center gap-3">
                                <img src="/favicon.svg" alt="KnowBear Logo" className="w-16 h-16 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)] group-hover:drop-shadow-[0_0_25px_rgba(6,182,212,0.8)] transition-all" />
                                <span>Know<span className="text-cyan-500 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">Bear</span></span>
                            </h1>
                        </button>
                        <p className="text-gray-400 mt-2 text-lg">AI-powered explanations for any topic</p>
                    </header>

                    <main className="space-y-8 flex-grow">
                        <SearchBar
                            onSearch={handleSearch}
                            loading={loading}
                            mode={mode}
                            onModeChange={setMode}
                            value={activeTopic}
                        />

                        <AnimatePresence mode="wait">
                            {loading && (!result || (fetchingLevels.has(selectedLevel) && !result.explanations[selectedLevel])) ? (
                                <motion.div
                                    key={`loading-${loadingMeta?.mode || mode}-${loadingMeta?.topic || activeTopic}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    transition={{ duration: 0.3 }}
                                    className="bg-dark-800/50 backdrop-blur-sm border border-dark-700 rounded-2xl shadow-2xl overflow-hidden"
                                >
                                    <LoadingState
                                        mode={loadingMeta?.mode || mode}
                                        level={loadingMeta?.level || selectedLevel}
                                        topic={loadingMeta?.topic || activeTopic}
                                    />
                                </motion.div>
                            ) : error ? (
                                <motion.div
                                    key="error"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-red-900/20 border border-red-500/50 text-red-200 p-8 rounded-2xl text-center space-y-4"
                                >
                                    <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-2xl">⚠️</span>
                                    </div>
                                    <h3 className="text-lg font-bold">Oops, something went wrong</h3>
                                    <p className="text-sm text-red-200/70 max-w-md mx-auto">{error}</p>
                                    <button
                                        onClick={() => {
                                            setLoadingMeta(null);
                                            handleSearch(activeTopic, true);
                                        }}
                                        className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl text-sm font-medium transition-all"
                                    >
                                        Try again
                                    </button>
                                </motion.div>
                            ) : result ? (
                                <motion.section
                                    key={`result-${result.topic}-${mode}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                    className="space-y-6"
                                >
                                    <div className="flex flex-col md:flex-row md:justify-between items-center gap-4">
                                        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                                            {mode !== 'technical_depth' && (
                                                <LevelDropdown selected={selectedLevel} onChange={setSelectedLevel} />
                                            )}
                                            <button
                                                onClick={() => handleSearch(result.topic, true)}
                                                disabled={loading}
                                                className={`${mode === 'technical_depth' ? 'flex' : 'hidden md:flex'} items-center gap-2 px-4 py-3 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-white transition-all disabled:opacity-50 w-full md:w-auto justify-center`}
                                                title="Regenerate"
                                            >
                                                <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                                <span className={`${mode === 'technical_depth' ? 'inline' : 'md:hidden lg:inline'} text-sm font-medium`}>Regenerate</span>
                                            </button>
                                        </div>
                                        <div className="hidden md:block">
                                            <ExportDropdown topic={result.topic} explanations={result.explanations} mode={mode} />
                                        </div>
                                    </div>

                                    <div id="export-content" className="space-y-6">
                                        <div className="border-b border-dark-700 pb-4 flex flex-col md:flex-row items-center md:justify-between gap-2">
                                            <h2 className="text-2xl md:text-3xl font-bold text-white text-center md:text-left tracking-tight">{result.topic}</h2>
                                            {isFromCache && (
                                                <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.1)] animate-pulse uppercase tracking-widest">
                                                    Loaded from session cache
                                                </span>
                                            )}
                                        </div>

                                        <div className="relative">
                                            <AnimatePresence mode="wait">
                                                {fetchingLevels.has(selectedLevel) && !result.explanations[selectedLevel] ? (
                                                    <motion.div
                                                        key="level-loading"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-700 shadow-xl overflow-hidden"
                                                    >
                                                        <LoadingState
                                                            mode={loadingMeta?.mode || mode}
                                                            level={loadingMeta?.level || selectedLevel}
                                                            topic={result.topic}
                                                        />
                                                    </motion.div>
                                                ) : result.explanations[selectedLevel] ? (
                                                    <motion.div
                                                        key={`explanation-${selectedLevel}`}
                                                        initial={{ opacity: 0, x: 20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ duration: 0.4 }}
                                                    >
                                                        <ExplanationCard
                                                            level={selectedLevel}
                                                            content={result.explanations[selectedLevel]}
                                                            mode={mode}
                                                            streaming={fetchingLevels.has(selectedLevel)}
                                                        />
                                                    </motion.div>
                                                ) : (
                                                    <motion.div
                                                        key="no-explanation"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        className="bg-dark-800/50 backdrop-blur-sm rounded-xl p-16 text-center border border-dark-700 shadow-xl"
                                                    >
                                                        <p className="text-gray-500 italic">No explanation available for this level.</p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </motion.section>
                            ) : (
                                <motion.section
                                    key="popular-topics"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="bg-dark-800/50 backdrop-blur-sm border border-dark-700 rounded-2xl p-6 shadow-2xl"
                                >
                                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                        <span className="w-2 h-6 bg-cyan-500 rounded-full mr-1"></span>
                                        Popular Topics
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {[
                                            { topic: 'blockchain', description: 'Distributed ledger technology' },
                                            { topic: 'quantum computing', description: 'Quantum mechanics in computing' },
                                            { topic: 'artificial intelligence', description: 'Machine learning & neural networks' },
                                            { topic: 'climate change', description: 'Environmental science' },
                                            { topic: 'cryptocurrency', description: 'Bitcoin, Ethereum & NFTs' },
                                            { topic: 'space exploration', description: 'SpaceX, NASA & beyond' },
                                        ].map(({ topic, description }) => (
                                            <button
                                                key={topic}
                                                onClick={() => handleSearch(topic)}
                                                disabled={loading}
                                                className="group flex flex-col items-start gap-2 p-4 bg-dark-700/50 hover:bg-dark-700 border border-dark-600 hover:border-cyan-500/50 rounded-xl transition-all text-left shadow-lg"
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-white font-medium text-sm group-hover:text-cyan-400 transition-colors uppercase tracking-wide">{topic}</span>
                                                    <span className="text-gray-400 text-xs mt-1">{description}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </motion.section>
                            )}
                        </AnimatePresence>
                    </main>

                    <footer className="mt-auto pt-16 text-center text-gray-600 text-xs pb-4 tracking-widest uppercase">
                        © 2026 KnowBear • Smart Explanations
                    </footer>
                </div>
            </div>

            <MobileBottomNav
                onRegenerate={() => result && handleSearch(result.topic, true)}
                topic={result?.topic || ''}
                explanations={result?.explanations || {}}
                loading={loading}
                hasResult={!!result}
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                mode={mode}
            />

            <UpgradeModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
        </div >
    )
}
