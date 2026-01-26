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
import { SkeletonLoader, CardSkeleton } from '../components/SkeletonLoader'

export default function AppPage() {
    // const [pinned, setPinned] = useState<PinnedTopic[]>([])
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<QueryResponse | null>(null)
    const [selectedLevel, setSelectedLevel] = useState<Level>('eli5')
    const [error, setError] = useState<string | null>(null)
    const [mode, setMode] = useState<Mode>('fast')
    const [fetchingLevels, setFetchingLevels] = useState<Set<Level>>(new Set())
    const [failedLevels, setFailedLevels] = useState<Set<Level>>(new Set())
    const [historyRefresh, setHistoryRefresh] = useState(0)
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [activeTopic, setActiveTopic] = useState('')

    const { checkAction, recordAction, showPremiumModal, setShowPremiumModal } = useUsageGate()

    // Use a ref to track current search topic to avoid race conditions
    const currentTopicRef = useRef<string | null>(null)


    const fetchLevel = useCallback(async (topic: string, level: Level) => {
        if (!topic) return
        setFetchingLevels(prev => new Set(prev).add(level))

        let accumulatedContent = ''

        try {
            await queryTopicStream(
                {
                    topic,
                    levels: [level],
                    mode,
                    premium: localStorage.getItem('knowbear_pro_status') === 'true'
                },
                (chunk) => {
                    accumulatedContent += chunk
                    if (currentTopicRef.current === topic) {
                        setResult(prev => {
                            if (!prev || prev.topic !== topic) {
                                return {
                                    topic,
                                    explanations: { [level]: accumulatedContent },
                                    cached: false
                                }
                            }
                            return {
                                ...prev,
                                explanations: { ...prev.explanations, [level]: accumulatedContent }
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
                    setHistoryRefresh(prev => prev + 1)
                },
                (err) => {
                    console.error(`Failed to stream ${level}:`, err)
                    setFailedLevels(prev => new Set(prev).add(level))
                    setFetchingLevels(prev => {
                        const next = new Set(prev)
                        next.delete(level)
                        return next
                    })
                }
            )
        } catch (err) {
            console.error(`Failed to start stream for ${level}:`, err)
            setFailedLevels(prev => new Set(prev).add(level))
            setFetchingLevels(prev => {
                const next = new Set(prev)
                next.delete(level)
                return next
            })
        }
    }, [mode])

    const handleSearch = useCallback(async (topic: string, _forceRefresh: boolean = false) => {
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

        recordAction('search', effectiveMode)

        setActiveTopic(topic)
        setLoading(true)
        setError(null)
        setResult(null)
        setFetchingLevels(new Set())
        setFailedLevels(new Set())
        currentTopicRef.current = topic

        // Use fetchLevel which now handles streaming
        await fetchLevel(topic, selectedLevel)
        setLoading(false)
    }, [mode, selectedLevel, fetchLevel, checkAction, recordAction])

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
                onSelectTopic={(topic) => handleSearch(topic)}
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

                        {!result && loading && (
                            <div className="space-y-8 animate-pulse">
                                <div className="h-10 bg-dark-700/50 rounded-full w-48 mx-auto mb-8"></div>
                                <CardSkeleton />
                                <div className="space-y-4">
                                    <SkeletonLoader />
                                </div>
                            </div>
                        )}

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
                                            className="hidden md:flex items-center gap-2 px-4 py-3 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-white transition-all disabled:opacity-50 w-full md:w-auto justify-center"
                                            title="Regenerate"
                                        >
                                            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                            <span className="md:hidden lg:inline text-sm font-medium">Regenerate</span>
                                        </button>
                                    </div>
                                    <div className="hidden md:block">
                                        <ExportDropdown topic={result.topic} explanations={result.explanations} mode={mode} />
                                    </div>
                                </div>

                                {fetchingLevels.has(selectedLevel) ? (
                                    <div className="bg-dark-800/50 backdrop-blur-sm rounded-xl p-8 border border-dark-700 shadow-xl">
                                        <SkeletonLoader />
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

            <MobileBottomNav
                onRegenerate={() => result && handleSearch(result.topic, true)}
                topic={result?.topic || ''}
                explanations={result?.explanations || {}}
                loading={loading}
                hasResult={!!result}
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            <UpgradeModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
        </div>
    )
}
