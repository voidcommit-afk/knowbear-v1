import { useState, useRef, useEffect } from 'react'
import type { Level } from '../types'
import { FREE_LEVELS } from '../types'

interface LevelDropdownProps {
    selected: Level
    onChange: (level: Level) => void
}

const LEVEL_LABELS: Record<Level, string> = {
    eli5: 'Like I\'m 5',
    eli10: 'Like I\'m 10',
    eli12: 'Like I\'m 12',
    eli15: 'Like I\'m 15',
    meme: 'Meme Style',
    classic60: 'Classic (80s/90s)',
    gentle70: 'Gentle & Kind',
    warm80: 'Warm & Fuzzy',
    technical: 'Technical',
    systemic: 'Systemic View',
    diagram: 'System Diagram',
}

export default function LevelDropdown({ selected, onChange }: LevelDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelect = (level: Level) => {
        onChange(level)
        setIsOpen(false)
    }


    return (
        <div className="relative w-full md:w-64" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-white transition-all outline-none focus:border-accent-primary"
            >
                <span className="font-medium">{LEVEL_LABELS[selected]}</span>
                <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-dark-800 border border-dark-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {FREE_LEVELS.map((level) => (
                        <button
                            key={level}
                            onClick={() => handleSelect(level)}
                            className={`w-full text-left px-4 py-3 text-sm transition-colors ${selected === level
                                ? 'bg-accent-primary/10 text-accent-primary font-medium'
                                : 'text-gray-300 hover:bg-dark-700'
                                }`}
                        >
                            {LEVEL_LABELS[level]}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
