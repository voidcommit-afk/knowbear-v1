import { useState, FormEvent } from 'react'

interface SearchBarProps {
    onSearch: (topic: string) => void
    loading?: boolean
    mode: 'fast' | 'ensemble'
    onModeChange: (mode: 'fast' | 'ensemble') => void
}

export default function SearchBar({ onSearch, loading, mode, onModeChange }: SearchBarProps) {
    const [topic, setTopic] = useState('')

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault()
        if (topic.trim() && !loading) onSearch(topic.trim())
    }

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-4">
            <div className="relative">
                <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Enter any topic to learn about..."
                    maxLength={200}
                    className="w-full px-6 py-4 bg-dark-700 border border-dark-500 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-accent-green focus:ring-1 focus:ring-accent-green transition-all"
                    disabled={loading}
                    aria-label="Topic search"
                />
                <button
                    type="submit"
                    disabled={loading || !topic.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-accent-green text-black font-semibold rounded-lg hover:bg-accent-teal disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {loading ? 'Generating...' : 'Explain'}
                </button>
            </div>

            <div className="flex justify-center gap-4">
                <button
                    type="button"
                    onClick={() => onModeChange('fast')}
                    className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${mode === 'fast'
                            ? 'bg-accent-green/20 text-accent-green border border-accent-green'
                            : 'text-gray-400 hover:text-white border border-transparent'
                        }`}
                >
                    🚀 Fast Mode
                </button>
                <button
                    type="button"
                    onClick={() => onModeChange('ensemble')}
                    className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${mode === 'ensemble'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500'
                            : 'text-gray-400 hover:text-white border border-transparent'
                        }`}
                >
                    🧠 Deep Research (Ensemble)
                </button>
            </div>
        </form>
    )
}
