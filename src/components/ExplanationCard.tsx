import type { Level } from '../types'

interface ExplanationCardProps {
    level: Level
    content: string
}

const LEVEL_COLORS: Record<Level, string> = {
    eli5: 'border-l-green-500',
    eli10: 'border-l-teal-500',
    eli12: 'border-l-cyan-500',
    eli15: 'border-l-blue-500',
    meme: 'border-l-purple-500',
    classic60: 'border-l-yellow-500',
    gentle70: 'border-l-indigo-500',
    warm80: 'border-l-rose-500',
    technical: 'border-l-orange-500',
    systemic: 'border-l-red-500',
    diagram: 'border-l-pink-500',
}

const LEVEL_NAMES: Record<Level, string> = {
    eli5: 'Explain Like I\'m 5',
    eli10: 'Explain Like I\'m 10',
    eli12: 'Explain Like I\'m 12',
    eli15: 'Explain Like I\'m 15',
    meme: 'Meme Explanation',
    classic60: 'Classic Mode',
    gentle70: 'Gentle Mode',
    warm80: 'Warm Mode',
    technical: 'Technical Deep Dive',
    systemic: 'Systemic View',
    diagram: 'System Diagram',
}

export default function ExplanationCard({ level, content }: ExplanationCardProps) {
    return (
        <div
            className={`bg-dark-700 border-l-4 ${LEVEL_COLORS[level]} rounded-lg p-6 transition-all`}
        >
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                {LEVEL_NAMES[level]}
            </h3>
            <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
    )
}
