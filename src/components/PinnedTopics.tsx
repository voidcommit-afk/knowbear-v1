import type { PinnedTopic } from '../types'

interface PinnedTopicsProps {
    topics: PinnedTopic[]
    onSelect: (topic: string) => void
}

export default function PinnedTopics({ topics, onSelect }: PinnedTopicsProps) {
    return (
        <section className="w-full max-w-4xl mx-auto mt-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {topics.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => onSelect(t.title)}
                        className="p-4 bg-dark-700 border border-dark-500 rounded-xl hover:border-accent-green hover:bg-dark-600 transition-all text-left group"
                    >
                        <h3 className="font-medium text-white group-hover:text-accent-green transition-colors">
                            {t.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{t.description}</p>
                    </button>
                ))}
            </div>
        </section>
    )
}
