import { useState, useRef, useEffect } from 'react'
import { Zap, Sparkles, ChevronDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Mode } from '../types'

interface ModeDropdownProps {
    selected: Mode
    onChange: (mode: Mode) => void
    disabled?: boolean
}

const MODES: { id: Mode; label: string; description: string; icon: LucideIcon; color: string }[] = [
    {
        id: 'fast',
        label: 'Fast',
        description: 'Speed-optimized, standard answers.',
        icon: Zap,
        color: 'text-cyan-400',
    },
    {
        id: 'ensemble',
        label: 'Ensemble',
        description: 'High-accuracy synthesis from multiple models.',
        icon: Sparkles,
        color: 'text-purple-400',
    },
]

export default function ModeDropdown({ selected, onChange, disabled }: ModeDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const selectedMode = MODES.find((m) => m.id === selected) || MODES[0]

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelect = (modeId: Mode) => {
        if (modeId !== selected) onChange(modeId)
        setIsOpen(false)
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className="flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 bg-dark-800 border border-dark-600 hover:border-dark-400 hover:bg-dark-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-cyan-500/50 group relative overflow-hidden"
            >
                <selectedMode.icon className={`w-4 h-4 ${selectedMode.color}`} />
                <div className="flex flex-col items-start">
                    <span className="text-sm font-bold text-white leading-none">{selectedMode.label}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-0 w-[280px] max-w-[calc(100vw-2rem)] z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="bg-dark-800/95 backdrop-blur-xl border border-dark-600 rounded-2xl shadow-2xl overflow-hidden p-1.5 space-y-1">
                        {MODES.map((m) => (
                            <button
                                key={m.id}
                                onClick={() => handleSelect(m.id)}
                                className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all group ${selected === m.id ? 'bg-cyan-500/10 border border-cyan-500/20' : 'hover:bg-white/5 border border-transparent'}`}
                            >
                                <div className={`p-2 rounded-lg ${selected === m.id ? 'bg-cyan-500/20' : 'bg-dark-700'} group-hover:scale-110 transition-transform`}>
                                    <m.icon className={`w-4 h-4 ${m.color}`} />
                                </div>
                                <div className="flex flex-col items-start text-left">
                                    <span className={`text-sm font-bold ${selected === m.id ? 'text-cyan-400' : 'text-white'}`}>{m.label}</span>
                                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">{m.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
