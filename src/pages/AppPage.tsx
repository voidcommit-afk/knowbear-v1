import { useState, useCallback, useRef, useEffect } from 'react'
import { queryTopic } from '../api'
import type { QueryResponse, Level, Mode } from '../types'
import SearchBar from '../components/SearchBar'
import LevelDropdown from '../components/LevelDropdown'
import ExplanationCard from '../components/ExplanationCard'
import ExportDropdown from '../components/ExportDropdown'
import Spinner from '../components/Spinner'
import { useUsageGate } from '../hooks/useUsageGate'
import { UpgradeModal } from '../components/UpgradeModal'
import { RefreshCcw } from 'lucide-react'
import Sidebar from '../components/Sidebar'

export default function AppPage() {
    // const [pinned, setPinned] = useState<PinnedTopic[]>([])
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<QueryResponse | null>(null)
    const [selectedLevel, setSelectedLevel] = useState<Level>('eli5')
    const [error, setError] = useState<string | null>(null)
    const [mode, setMode] = useState<Mode>('fast')
    const [fetchingLevels, setFetchingLevels] = useState<Set<Level>>(new Set())
    const [historyRefresh, setHistoryRefresh] = useState(0)

    const { checkAction, recordAction, showPremiumModal, setShowPremiumModal } = useUsageGate()

    // Use a ref to track current search topic to avoid race conditions
    const currentTopicRef = useRef<string | null>(null)


    const fetchLevel = useCallback(async (topic: string, level: Level) => {
        if (!topic) return
        setFetchingLevels(prev => new Set(prev).add(level))
        try {
            const res = await queryTopic({
                topic,
                levels: [level],
                mode
            })

            // Only update if it's still the current topic
            if (currentTopicRef.current === topic) {
                setResult(prev => {
                    if (!prev || prev.topic !== topic) {
                        return { ...res, explanations: { ...res.explanations } }
                    }
                    return {
                        ...prev,
                        explanations: { ...prev.explanations, ...res.explanations }
                    }
                })
            }
        } catch (err) {
            console.error(`Failed to fetch ${level}:`, err)
        } finally {
            setFetchingLevels(prev => {
                const next = new Set(prev)
                next.delete(level)
                return next
            })
        }
    }, [mode])

    const handleSearch = useCallback(async (topic: string, forceRefresh: boolean = false) => {
        // Usage gate check (handles Guest limits and Soft Gates like Deep Dive)
        const { allowed: searchAllowed, downgraded } = checkAction('search', mode)

        if (!searchAllowed) {
            return
        }

        // Gating for Premium Modes (Hard Gate execution check)
        if (mode === 'ensemble' || mode === 'technical_depth') {
            const { allowed } = checkAction('premium_mode')
            if (!allowed) return
        }

        // Determine actual mode to use (Downgrade if needed)
        const effectiveMode = downgraded ? 'fast' : mode

        recordAction('search', mode)

        setLoading(true)
        setError(null)
        setResult(null)
        setFetchingLevels(new Set())
        currentTopicRef.current = topic

        try {
            // Initial fetch for the selected level only for speed
            const res = await queryTopic({
                topic,
                levels: [selectedLevel],
                mode: effectiveMode,
                bypass_cache: forceRefresh
            })

            if (currentTopicRef.current === topic) {
                setResult(res)

                // OPTIMIZATION: Removed aggressive pre-fetching of all levels to save tokens/costs.
                // Levels will be lazy-loaded only when the user selects them via fetchLevel useEffect.
                setHistoryRefresh(prev => prev + 1)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate')
        } finally {
            setLoading(false)
        }
    }, [mode, selectedLevel, fetchLevel, checkAction, recordAction])

    const handleGoHome = useCallback(() => {
        setResult(null)
        setError(null)
        setLoading(false)
        currentTopicRef.current = null
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }, [])

    // Fetch level when user switches and it's missing
    useEffect(() => {
        if (result && !result.explanations[selectedLevel] && !fetchingLevels.has(selectedLevel)) {
            fetchLevel(result.topic, selectedLevel)
        }
    }, [selectedLevel, result, fetchingLevels, fetchLevel])

    return (
        <div className="flex min-h-screen bg-black overflow-hidden">
            <Sidebar
                onSelectTopic={(topic) => handleSearch(topic)}
                refreshTrigger={historyRefresh}
            />

            {/* Main Content Area */}
            <div className="flex-1 min-w-0 flex flex-col relative transition-all duration-300 pl-16 md:pl-64">
                {/* Starry Background */}
                <div className="stars"></div>
                <div className="stars stars-2"></div>

                {/* Content Container */}
                <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col min-h-[90vh] py-8 px-4 md:px-8">

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
                        />

                        {!result && !loading && (
                            <section className="bg-dark-800/50 backdrop-blur-sm border border-dark-700 rounded-2xl p-6 shadow-2xl">
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
                            </section>
                        )}

                        {loading && (
                            <div className="py-12 flex flex-col items-center">
                                <Spinner size="lg" />
                                <p className="text-center text-gray-400 mt-4 animate-pulse">Generating explanation for {selectedLevel}...</p>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-900/30 border border-red-500 text-red-300 p-4 rounded-lg">
                                {error}
                            </div>
                        )}

                        {/* Result Section */}
                        {result && !loading && (
                            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="border-b border-dark-700 pb-4">
                                    <h2 className="text-2xl md:text-3xl font-bold text-white text-center md:text-left tracking-tight">{result.topic}</h2>
                                </div>

                                <div className="flex flex-col md:flex-row md:justify-between items-center gap-4">
                                    <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                                        <LevelDropdown selected={selectedLevel} onChange={setSelectedLevel} />
                                        <button
                                            onClick={() => handleSearch(result.topic, true)}
                                            disabled={loading}
                                            className="flex items-center gap-2 px-4 py-3 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-white transition-all disabled:opacity-50 w-full md:w-auto justify-center"
                                            title="Regenerate"
                                        >
                                            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                            <span className="md:hidden lg:inline text-sm font-medium">Regenerate</span>
                                        </button>
                                    </div>
                                    <ExportDropdown topic={result.topic} explanations={result.explanations} />
                                </div>

                                {fetchingLevels.has(selectedLevel) ? (
                                    <div className="bg-dark-800/50 backdrop-blur-sm rounded-xl p-16 flex flex-col items-center border border-dark-700 shadow-xl">
                                        <Spinner size="md" />
                                        <p className="text-gray-400 mt-4 font-medium italic">Brewing {selectedLevel.toUpperCase()} explanation...</p>
                                    </div>
                                ) : result.explanations[selectedLevel] ? (
                                    <ExplanationCard level={selectedLevel} content={result.explanations[selectedLevel]} />
                                ) : (
                                    <div className="bg-dark-800/50 backdrop-blur-sm rounded-xl p-16 text-center border border-dark-700 shadow-xl">
                                        <p className="text-gray-500 italic">No explanation available for this level.</p>
                                    </div>
                                )}

                            </section>
                        )}
                    </main>

                    <footer className="mt-auto pt-16 text-center text-gray-600 text-xs pb-4 tracking-widest uppercase">
                        © 2026 KnowBear • Smart Explanations
                    </footer>
                </div>
            </div>

            <UpgradeModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
        </div>
    )
}
