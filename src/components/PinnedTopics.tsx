import type { PinnedTopic } from '../types'

interface PinnedTopicsProps {
    topics: PinnedTopic[]
    onSelect: (topic: string) => void
}

export default function PinnedTopics({ topics, onSelect }: PinnedTopicsProps) {
    return (
        <section className="w-full max-w-4xl mx-auto mt-32 sm:mt-40">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Popular Topics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {topics.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => onSelect(t.title)}
                        className="p-3 bg-dark-800 border border-dark-600 rounded-xl hover:border-cyan-500/70 hover:bg-dark-700 transition-colors text-left group focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                    >
                        <h3 className="font-medium text-white group-hover:text-cyan-400 transition-colors">
                            {t.title}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">{t.description}</p>
                    </button>
                ))}
            </div>
        </section>
    )
}
