import { useState, useEffect, useCallback } from 'react'
import { getPinnedTopics, queryTopic } from './api'
import type { PinnedTopic, QueryResponse, Level } from './types'
import { FREE_LEVELS } from './types'
import SearchBar from './components/SearchBar'
import PinnedTopics from './components/PinnedTopics'
import LevelDropdown from './components/LevelDropdown'
import ExplanationCard from './components/ExplanationCard'
import ExportButtons from './components/ExportButtons'
import Spinner from './components/Spinner'

export default function App() {
    const [pinned, setPinned] = useState<PinnedTopic[]>([])
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<QueryResponse | null>(null)
    const [selectedLevel, setSelectedLevel] = useState<Level>('eli5')
    const [error, setError] = useState<string | null>(null)
    const [mode, setMode] = useState<'fast' | 'ensemble'>('fast')

    useEffect(() => {
        getPinnedTopics()
            .then(setPinned)
            .catch(() => { })
    }, [])

    const handleSearch = useCallback(async (topic: string) => {
        setLoading(true)
        setError(null)
        setResult(null)
        try {
            const res = await queryTopic({
                topic,
                levels: [...FREE_LEVELS],
                mode
            })
            setResult(res)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate')
        } finally {
            setLoading(false)
        }
    }, [mode])

    return (
        <div className="min-h-screen bg-dark-900 px-4 py-8">
            <header className="text-center mb-12">
                <h1 className="text-4xl font-bold text-white mb-2">
                    🐻 Know<span className="text-accent-green">Bear</span>
                </h1>
                <p className="text-gray-400">AI-powered explanations for any topic</p>
            </header>

            <main className="max-w-4xl mx-auto space-y-8">
                <SearchBar
                    onSearch={handleSearch}
                    loading={loading}
                    mode={mode}
                    onModeChange={setMode}
                />

                {loading && (
                    <div className="py-12">
                        <Spinner size="lg" />
                        <p className="text-center text-gray-400 mt-4">Generating explanations...</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-900/30 border border-red-500 text-red-300 p-4 rounded-lg">
                        {error}
                    </div>
                )}

                {result && (
                    <section className="space-y-6">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <h2 className="text-xl font-semibold text-white">{result.topic}</h2>
                            <ExportButtons topic={result.topic} explanations={result.explanations} />
                        </div>

                        <LevelDropdown selected={selectedLevel} onChange={setSelectedLevel} />

                        {result.explanations[selectedLevel] && (
                            <ExplanationCard level={selectedLevel} content={result.explanations[selectedLevel]} />
                        )}

                        {result.cached && (
                            <p className="text-sm text-gray-500">⚡ Served from cache</p>
                        )}
                    </section>
                )}

                {!result && !loading && <PinnedTopics topics={pinned} onSelect={handleSearch} />}
            </main>

            <footer className="mt-16 text-center text-gray-600 text-sm">
                © 2026 KnowBear • Powered by Groq AI
            </footer>
        </div>
    )
}
