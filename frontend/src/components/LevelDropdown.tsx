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
    technical: 'Technical',
    systemic: 'Systemic View',
    diagram: 'System Diagram',
}

export default function LevelDropdown({ selected, onChange }: LevelDropdownProps) {
    return (
        <div className="flex gap-2 flex-wrap">
            {FREE_LEVELS.map((level) => (
                <button
                    key={level}
                    onClick={() => onChange(level)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selected === level
                            ? 'bg-accent-green text-black'
                            : 'bg-dark-600 text-gray-300 hover:bg-dark-500'
                        }`}
                >
                    {LEVEL_LABELS[level]}
                </button>
            ))}
        </div>
    )
}
