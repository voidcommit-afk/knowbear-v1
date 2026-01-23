import { useState, useRef, useEffect } from 'react'
import { Search, Loader2, Sparkles, Zap, BookOpen, Lock, Terminal } from 'lucide-react'
import type { Mode } from '../types'
import { useUsageGate } from '../hooks/useUsageGate'

interface SearchBarProps {
    onSearch: (topic: string) => void
    loading: boolean
    mode: Mode
    onModeChange: (mode: Mode) => void
}

export default function SearchBar({ onSearch, loading, mode, onModeChange }: SearchBarProps) {
    const [topic, setTopic] = useState('')
    const [isFocused, setIsFocused] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const { isPro, checkAction } = useUsageGate()

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '/' && !isFocused) {
                e.preventDefault()
                inputRef.current?.focus()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isFocused])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (topic.trim() && !loading) {
            onSearch(topic)
        }
    }

    const handleModeSelect = (newMode: Mode) => {
        if (newMode === mode) return

        // Hard Gating: Signal pro-only features at selection time
        if (newMode === 'ensemble' || newMode === 'technical_depth') {
            const { allowed } = checkAction('premium_mode', newMode)
            if (!allowed) return // Modal handled by hook
        }

        // Soft Gating (Deep Dive): Allow selection, gate at usage time
        onModeChange(newMode)
    }

    return (
        <div className="w-full max-w-3xl mx-auto space-y-6">
            <form onSubmit={handleSubmit} className="relative group z-20">
                <div className={`absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl opacity-20 group-hover:opacity-40 transition duration-500 ${isFocused ? 'opacity-60' : ''}`}></div>
                <div className="relative flex items-center bg-dark-800 border border-dark-600 rounded-xl p-2 transition-all shadow-xl group-hover:border-dark-500">
                    <Search className={`ml-3 w-5 h-5 transition-colors ${isFocused ? 'text-cyan-400' : 'text-gray-500'}`} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder="What passes for knowledge...?"
                        className="w-full bg-transparent text-white placeholder-gray-500 px-4 py-3 outline-none text-lg"
                        disabled={loading}
                    />
                    <div className="hidden md:flex items-center gap-2 pr-3 text-xs text-dark-400 font-medium">
                        <kbd className="bg-dark-700/50 px-2 py-1 rounded border border-dark-600">/</kbd>
                        <span>to focus</span>
                    </div>
                    <button
                        type="submit"
                        disabled={!topic.trim() || loading}
                        className="ml-2 px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-medium transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-cyan-900/20"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Generating...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                <span>Explain</span>
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Mode Selection */}
            <div className="flex flex-wrap justify-center gap-4">
                <button
                    type="button"
                    onClick={() => handleModeSelect('fast')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${mode === 'fast'
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : 'text-gray-400 hover:text-white hover:bg-dark-700/50 border border-transparent'
                        }`}
                >
                    <Zap className="w-4 h-4" />
                    <span>Fast</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleModeSelect('deep_dive')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${mode === 'deep_dive'
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                        : 'text-gray-400 hover:text-white hover:bg-dark-700/50 border border-transparent'
                        }`}
                >
                    <BookOpen className="w-4 h-4" />
                    <span>Deep Dive</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleModeSelect('ensemble')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${mode === 'ensemble'
                        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]'
                        : 'text-gray-400 hover:text-white hover:bg-dark-700/50 border border-transparent'
                        }`}
                >
                    <Sparkles className="w-4 h-4" />
                    <span>Ensemble</span>
                    {!isPro && <Lock className="w-3 h-3 text-yellow-500/70 ml-1" />}
                </button>

                <button
                    type="button"
                    onClick={() => handleModeSelect('technical_depth')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${mode === 'technical_depth'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                        : 'text-gray-400 hover:text-white hover:bg-dark-700/50 border border-transparent'
                        }`}
                >
                    <Terminal className="w-4 h-4" />
                    <span>Technical Depth</span>
                    {!isPro && <Lock className="w-3 h-3 text-red-500/70 ml-1" />}
                </button>
            </div>
        </div>
    )
}
