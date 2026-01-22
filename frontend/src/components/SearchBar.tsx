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
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-6">
            <div className="relative group flex flex-col md:block">
                <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Enter any topic to learn about..."
                    maxLength={200}
                    className="w-full px-6 py-4 bg-dark-700/80 backdrop-blur-sm border border-dark-500 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all shadow-lg md:pr-32"
                    disabled={loading}
                    aria-label="Topic search"
                />
                <button
                    type="submit"
                    disabled={loading || !topic.trim()}
                    className="mt-3 w-full md:mt-0 md:w-auto md:absolute md:right-2 md:top-1/2 md:-translate-y-1/2 px-6 py-2 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:shadow-[0_0_25px_rgba(6,182,212,0.7)]"
                >
                    {loading ? 'Generating...' : 'Explain'}
                </button>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
                <button
                    type="button"
                    onClick={() => onModeChange('fast')}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 border ${mode === 'fast'
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : 'text-gray-400 border-transparent hover:text-cyan-400 hover:border-cyan-500/50'
                        }`}
                >
                    Fast Mode
                </button>
                <button
                    type="button"
                    onClick={() => onModeChange('ensemble')}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 border ${mode === 'ensemble'
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : 'text-gray-400 border-transparent hover:text-cyan-400 hover:border-cyan-500/50'
                        }`}
                >
                    Brief Dive
                </button>
            </div>
        </form>
    )
}
