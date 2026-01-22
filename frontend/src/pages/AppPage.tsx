import { useState, useEffect, useCallback, useRef } from 'react'
import { getPinnedTopics, queryTopic } from '../api'
import type { PinnedTopic, QueryResponse, Level } from '../types'
import { FREE_LEVELS } from '../types'
import SearchBar from '../components/SearchBar'
import PinnedTopics from '../components/PinnedTopics'
import LevelDropdown from '../components/LevelDropdown'
import ExplanationCard from '../components/ExplanationCard'
import ExportDropdown from '../components/ExportDropdown'
import Spinner from '../components/Spinner'
import { useUsageGate } from '../hooks/useUsageGate'
import { UpgradeModal } from '../components/UpgradeModal'
import { RefreshCcw } from 'lucide-react'

export default function AppPage() {
    const [pinned, setPinned] = useState<PinnedTopic[]>([])
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<QueryResponse | null>(null)
    const [selectedLevel, setSelectedLevel] = useState<Level>('eli5')
    const [error, setError] = useState<string | null>(null)
    const [mode, setMode] = useState<'fast' | 'ensemble' | 'brief_dive'>('brief_dive')
    const [fetchingLevels, setFetchingLevels] = useState<Set<Level>>(new Set())

    const { checkAction, recordAction, showPremiumModal, setShowPremiumModal } = useUsageGate()

    // Use a ref to track current search topic to avoid race conditions
    const currentTopicRef = useRef<string | null>(null)

    useEffect(() => {
        getPinnedTopics()
            .then(setPinned)
            .catch(() => { })
    }, [])

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

    const handleSearch = useCallback(async (topic: string) => {
        // Usage gate check (handles both Guest and Pro limits if any)
        if (!checkAction('search')) {
            return
        }
        recordAction('search')

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
                mode
            })

            if (currentTopicRef.current === topic) {
                setResult(res)

                // Background fetch others if in fast mode to pre-cache
                if (mode === 'fast') {
                    FREE_LEVELS.forEach(lvl => {
                        if (lvl !== selectedLevel) {
                            fetchLevel(topic, lvl)
                        }
                    })
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate')
        } finally {
            setLoading(false)
        }
    }, [mode, selectedLevel, fetchLevel])

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
        <div className="min-h-screen bg-black px-4 py-8 relative overflow-hidden">
            {/* Starry Background */}
            <div className="stars"></div>
            <div className="stars stars-2"></div>

            {/* Content Container */}
            <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col min-h-[90vh]">
                <header className="text-center mb-12 flex flex-col items-center">
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
                        <section className="bg-dark-800/50 backdrop-blur-sm border border-dark-700 rounded-2xl p-6">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                                        className="group flex flex-col items-start gap-2 p-4 bg-dark-700/50 hover:bg-dark-700 border border-dark-600 hover:border-cyan-500/50 rounded-xl transition-all text-left"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-white font-medium text-sm group-hover:text-cyan-400 transition-colors">{topic}</span>
                                            <span className="text-gray-400 text-xs">{description}</span>
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

                    {result && (
                        <section className="space-y-6">
                            <div className="border-b border-dark-700 pb-4">
                                <h2 className="text-2xl font-semibold text-white text-center md:text-left">{result.topic}</h2>
                            </div>

                            <div className="flex flex-col md:flex-row md:justify-between items-center gap-4">
                                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                                    <LevelDropdown selected={selectedLevel} onChange={setSelectedLevel} />
                                    <button
                                        onClick={() => handleSearch(result.topic)}
                                        disabled={loading}
                                        className="flex items-center gap-2 px-4 py-3 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-white transition-all disabled:opacity-50 w-full md:w-auto justify-center"
                                        title="Recreate Response"
                                    >
                                        <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                        <span className="md:hidden lg:inline">Recreate</span>
                                    </button>
                                </div>
                                <ExportDropdown topic={result.topic} explanations={result.explanations} />
                            </div>

                            {fetchingLevels.has(selectedLevel) ? (
                                <div className="bg-dark-700/50 backdrop-blur-sm rounded-lg p-12 flex flex-col items-center border border-dark-600">
                                    <Spinner size="md" />
                                    <p className="text-gray-400 mt-4">Brewing {selectedLevel} explanation...</p>
                                </div>
                            ) : result.explanations[selectedLevel] ? (
                                <ExplanationCard level={selectedLevel} content={result.explanations[selectedLevel]} />
                            ) : (
                                <div className="bg-dark-700/50 backdrop-blur-sm rounded-lg p-12 text-center text-gray-500 italic border border-dark-600">
                                    No explanation available for this level.
                                </div>
                            )}


                        </section>
                    )}

                    {!result && !loading && <PinnedTopics topics={pinned} onSelect={handleSearch} />}
                </main>

                <footer className="mt-16 text-center text-gray-600 text-sm pb-4">
                    © 2026 KnowBear
                </footer>
            </div>

            <UpgradeModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
        </div>
    )
}
