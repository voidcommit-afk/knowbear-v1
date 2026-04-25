import { motion } from 'framer-motion'
import { Search, Pin, Sparkles, Zap, ChevronLeft, ChevronRight, Github } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import ExplanationCard from '../components/ExplanationCard'
import LevelDropdown from '../components/LevelDropdown'
import { LoadingState } from '../components/LoadingState'
import type { Level, Mode, PinnedTopic } from '../types'
import { useKnowBearStore } from '../store/useKnowBearStore'

export default function LandingPage() {
    const [placeholderIndex, setPlaceholderIndex] = useState(0)
    const [isFocused, setIsFocused] = useState(false)
    const [topic, setTopic] = useState('')
    const placeholders = useMemo(
        () => [
            'Why did Rome collapse?',
            'Explain TCP/IP for exams',
            'Compare Linux vs Windows for coding',
            'Build a SaaS from PDFs',
        ],
        []
    )

    const loading = useKnowBearStore((state) => state.loading)
    const result = useKnowBearStore((state) => state.result)
    const selectedLevel = useKnowBearStore((state) => state.selectedLevel)
    const mode = useKnowBearStore((state) => state.mode)
    const fetchingLevels = useKnowBearStore((state) => state.fetchingLevels)
    const error = useKnowBearStore((state) => state.error)
    const loadingMeta = useKnowBearStore((state) => state.loadingMeta)
    const pinnedTopics = useKnowBearStore((state) => state.pinnedTopics)
    const isSidebarOpen = useKnowBearStore((state) => state.isSidebarOpen)
    const setIsSidebarOpen = useKnowBearStore((state) => state.setIsSidebarOpen)
    const setMode = useKnowBearStore((state) => state.setMode)
    const setSelectedLevel = useKnowBearStore((state) => state.setSelectedLevel)
    const startSearch = useKnowBearStore((state) => state.startSearch)
    const fetchPinnedTopics = useKnowBearStore((state) => state.fetchPinnedTopics)

    useEffect(() => {
        const timer = window.setInterval(() => {
            setPlaceholderIndex((current) => (current + 1) % placeholders.length)
        }, 2600)
        return () => window.clearInterval(timer)
    }, [placeholders.length])

    useEffect(() => {
        fetchPinnedTopics()
    }, [fetchPinnedTopics])

    const curatedPinned: PinnedTopic[] = useMemo(
        () => [
            { id: 'tcp-ip', title: 'TCP/IP Layers', description: 'Protocols and responsibilities by layer.' },
            { id: 'osi', title: 'OSI Model', description: 'A clean reference for network fundamentals.' },
            { id: 'linux-windows', title: 'Linux vs Windows for Dev', description: 'Tradeoffs for daily development.' },
            { id: 'rag', title: 'How LLM RAG Works', description: 'Retrieval + generation in practice.' },
        ],
        []
    )

    const pinnedList = pinnedTopics.length > 0 ? pinnedTopics : curatedPinned

    const handleSearch = async (nextTopic: string, requestedMode?: Mode, requestedLevel?: Level) => {
        if (!nextTopic.trim()) return
        await startSearch(nextTopic.trim(), false, requestedMode, requestedLevel)
    }

    return (
        <div className="min-h-screen landing-root text-white selection:bg-cyan-400/30">
            <div className="landing-bg">
                <div className="ambient-orb orb-one" />
                <div className="ambient-orb orb-two" />
                <div className="landing-grid" />
                <div className="landing-noise" />
            </div>

            <aside className={`landing-sidebar ${isSidebarOpen ? 'expanded' : 'collapsed'} hidden md:flex`}>
                <div className="flex flex-col gap-6 pt-6">
                    <div className={`flex items-center gap-3 ${isSidebarOpen ? 'px-4' : 'px-3'} justify-between`}>
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <img src="/favicon.svg" alt="KnowBear" className="w-5 h-5" />
                            </div>
                            {isSidebarOpen && <span className="text-sm font-semibold text-gray-100">KnowBear</span>}
                        </div>
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="sidebar-toggle"
                            aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                        >
                            {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                    </div>

                    <nav className={`flex flex-col gap-3 ${isSidebarOpen ? 'px-3' : 'px-2'}`}>
                        <SidebarIcon
                            label="New Search"
                            icon={<Search className="w-5 h-5" />}
                            expanded={isSidebarOpen}
                            onClick={() => handleSearch(topic || placeholders[placeholderIndex], mode, selectedLevel)}
                        />
                        <SidebarIcon
                            label="GitHub"
                            icon={<Github className="w-5 h-5" />}
                            expanded={isSidebarOpen}
                            href="https://github.com/sanjeevafk/knowbear-web"
                        />
                    </nav>

                    {isSidebarOpen && (
                        <div className="px-4">
                            <div className="sidebar-divider" />
                            <div className="mt-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gray-500">
                                <Pin className="w-3 h-3" />
                                Pinned Topics
                            </div>
                            <div className="mt-3 space-y-2">
                                {pinnedList.slice(0, 5).map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSearch(item.title)}
                                        className="sidebar-topic"
                                    >
                                        <span className="text-sm text-gray-200">{item.title}</span>
                                        <span className="text-xs text-gray-500">{item.description}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            <main className={`relative z-10 min-h-screen pr-4 md:pr-10 ${isSidebarOpen ? 'pl-4 md:pl-72' : 'pl-4 md:pl-28'}`}>
                <div className="max-w-6xl mx-auto pt-[16vh] pb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="max-w-3xl"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs uppercase tracking-[0.24em] text-gray-300">
                            Knowledge workspace
                        </div>
                        <h1 className="mt-5 text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-tight">
                            Search for a topic
                        </h1>
                        <p className="mt-4 text-gray-300 text-base sm:text-lg">
                            Fast answers with focused explanations.
                        </p>
                    </motion.div>

                    <motion.form
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.6, ease: 'easeOut' }}
                        className="mt-8 landing-search group"
                        onSubmit={(event) => {
                            event.preventDefault()
                            handleSearch(topic || placeholders[placeholderIndex])
                        }}
                    >
                        <div className={`landing-search-shell ${isFocused ? 'is-focused' : ''}`}>
                            <Sparkles className="w-5 h-5 text-cyan-300" />
                            <input
                                value={topic}
                                onChange={(event) => setTopic(event.target.value)}
                                placeholder={placeholders[placeholderIndex]}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                className="landing-search-input"
                            />
                        </div>

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setMode('fast')}
                                className={`landing-chip ${mode === 'fast' ? 'is-active' : ''}`}
                            >
                                <Zap className="w-4 h-4" />
                                Fast
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('ensemble')}
                                className={`landing-chip ${mode === 'ensemble' ? 'is-active' : ''}`}
                            >
                                Focus
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="landing-cta ml-auto w-full sm:w-auto"
                            >
                                Explain
                            </button>
                        </div>
                    </motion.form>

                    <div className="mt-6">
                        {loading && loadingMeta ? (
                            <LoadingState mode={loadingMeta.mode} level={loadingMeta.level} topic={loadingMeta.topic} />
                        ) : result ? (
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-2xl font-semibold text-white">{result.topic}</h2>
                                        <p className="text-sm text-gray-500">Mode: {mode === 'fast' ? 'Fast' : 'Focus'}</p>
                                    </div>
                                    <LevelDropdown selected={selectedLevel} onChange={setSelectedLevel} />
                                </div>
                                <ExplanationCard
                                    level={selectedLevel}
                                    content={result.explanations[selectedLevel] || ''}
                                    streaming={fetchingLevels.has(selectedLevel)}
                                />
                            </div>
                        ) : null}

                        {error && (
                            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                {error}
                            </div>
                        )}
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
                        className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    >
                        {pinnedList.slice(0, 6).map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleSearch(item.title)}
                                className="landing-card text-left"
                            >
                                <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/60">Pinned</p>
                                <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
                                <p className="mt-2 text-sm text-gray-400">{item.description}</p>
                            </button>
                        ))}
                    </motion.div>

                </div>
            </main>
        </div>
    )
}

function SidebarIcon({
    icon,
    label,
    expanded = false,
    onClick,
    href,
}: {
    icon: JSX.Element
    label: string
    expanded?: boolean
    onClick?: () => void
    href?: string
}) {
    const content = (
        <>
            {icon}
            {expanded ? <span className="text-sm text-gray-200">{label}</span> : <span className="sidebar-tooltip">{label}</span>}
        </>
    )

    if (href) {
        return (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`sidebar-icon group ${expanded ? 'expanded' : ''}`}
            >
                {content}
            </a>
        )
    }

    return (
        <button onClick={onClick} className={`sidebar-icon group ${expanded ? 'expanded' : ''}`}>
            {content}
        </button>
    )
}
