import React, { useState, useEffect } from 'react'
import type { Mode, Level } from '../types'
import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
    mode: Mode
    level: Level
    topic: string
}

export const LoadingState: React.FC<LoadingStateProps> = ({ mode, level, topic }) => {
    const [message, setMessage] = useState('')

    useEffect(() => {
        let baseMessage = 'Generating your explanation...'

        if (mode === 'technical_depth') {
            baseMessage = 'Deep-diving into the technical details...'
        } else if (level === 'eli5') {
            baseMessage = 'Brewing your ELI5 explanation...'
        } else if (level === 'eli10') {
            baseMessage = 'Preparing a simple 10-year-old friendly answer...'
        } else if (mode === 'fast' || mode === 'ensemble') {
            baseMessage = 'Crafting your answer...'
        }

        // Bonus hints
        const lowerTopic = topic.toLowerCase()
        if (lowerTopic.includes('diagram') || lowerTopic.includes('architecture') || lowerTopic.includes('flow') || lowerTopic.includes('sequence')) {
            baseMessage += ' and generating diagrams'
        } else if (lowerTopic.includes('code') || lowerTopic.includes('python') || lowerTopic.includes('javascript') || lowerTopic.includes('algorithm')) {
            baseMessage += ' including code examples'
        }

        setMessage(baseMessage)
    }, [mode, level, topic])

    return (
        <div className="flex flex-col items-center justify-center p-12 min-h-[300px] animate-in fade-in duration-700">
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
                <Loader2 className="w-12 h-12 text-cyan-500 animate-spin relative z-10" />
            </div>

            <div className="text-center space-y-2">
                <p className="text-xl font-medium text-white tracking-tight animate-pulse">
                    {message}
                    <span className="inline-flex w-8 text-left ml-0.5">
                        <span className="animate-[ellipsis_1.5s_infinite]">...</span>
                    </span>
                </p>
                <p className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed italic">
                    {mode === 'technical_depth' ? 'Consulting academic sources and real-time research context.' : 'Synthesizing knowledge for the perfect explanation.'}
                </p>
            </div>

            <style>{`
                @keyframes ellipsis {
                    0% { content: '.'; opacity: 0; }
                    33% { content: '..'; opacity: 0.5; }
                    66% { content: '...'; opacity: 1; }
                    100% { content: '.'; opacity: 0; }
                }
            `}</style>
        </div>
    )
}
