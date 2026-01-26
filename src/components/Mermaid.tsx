import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
})

interface MermaidProps {
    chart: string
}

export default function Mermaid({ chart }: MermaidProps) {
    const ref = useRef<HTMLDivElement>(null)
    const [hasError, setHasError] = useState(false)

    useEffect(() => {
        const renderDiagram = async () => {
            if (!ref.current || !chart) return

            // Unique ID for each diagram
            const id = 'mermaid-' + Math.random().toString(36).substr(2, 9)

            try {
                // Pre-validation to avoid Mermaid's internal error UI spam
                const isValid = await mermaid.parse(chart)
                if (!isValid) {
                    setHasError(true)
                    return
                }

                // Clear existing content
                ref.current.innerHTML = ''
                setHasError(false)

                const { svg } = await mermaid.render(id, chart)
                if (ref.current) {
                    ref.current.innerHTML = svg
                }
            } catch (err) {
                console.error('Mermaid render failure:', err)
                setHasError(true)
            }
        }

        renderDiagram()
    }, [chart])

    if (hasError) {
        return (
            <div className="flex flex-col items-center justify-center my-6 p-8 bg-dark-900/80 rounded-2xl border border-red-500/10 gap-4 shadow-xl">
                <div className="p-3 bg-red-500/10 rounded-full">
                    <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 14c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <div className="text-center">
                    <p className="text-red-400 text-sm font-bold uppercase tracking-widest mb-1">Architecture Diagram</p>
                    <p className="text-xs text-gray-500 italic">[Diagram unavailable — description provided in text above]</p>
                </div>
            </div>
        )
    }

    return (
        <div
            ref={ref}
            data-chart={chart.trim()}
            className="mermaid-container flex justify-center my-8 bg-dark-900/40 backdrop-blur-sm p-6 rounded-2xl border border-white/5 overflow-x-auto shadow-inner"
        />
    )
}
