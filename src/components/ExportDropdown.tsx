import { useState, useRef, useEffect } from 'react'
import { exportExplanations } from '../api'
import { useUsageGate } from '../hooks/useUsageGate'
import { Lock } from 'lucide-react'
import type { ExportRequest } from '../types'

interface ExportDropdownProps {
    topic: string
    explanations: Record<string, string>
}

const EXPORT_LABELS: Record<string, string> = {
    txt: 'Text File (.txt)',
    json: 'JSON Data (.json)',
    pdf: 'PDF Document (.pdf)',
    md: 'Markdown (.md)'
}

export default function ExportDropdown({ topic, explanations }: ExportDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const { checkAction, isPro } = useUsageGate()

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

    const handleExport = async (format: 'txt' | 'json' | 'pdf' | 'md') => {
        setIsOpen(false)

        const actionKey = format === 'pdf' ? 'export_pdf' : format === 'md' ? 'export_md' : undefined
        if (actionKey) {
            const allowed = checkAction(actionKey)
            if (!allowed) return
        }

        setLoading(true)
        try {
            const req: ExportRequest = { topic, explanations, format }
            const blob = await exportExplanations(req)
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${topic.slice(0, 20)}.${format}`
            a.click()
            URL.revokeObjectURL(url)
        } catch (err) {
            console.error('Export failed:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="relative w-full md:w-48" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={loading}
                className="w-full flex items-center justify-between px-4 py-3 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-white transition-all outline-none focus:border-accent-primary disabled:opacity-50"
            >
                <span className="font-medium">{loading ? 'Exporting...' : 'Export As'}</span>
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
                <div className="absolute z-50 w-full mt-2 bg-dark-800 border border-dark-600 rounded-lg shadow-xl overflow-hidden">
                    {(['txt', 'json', 'pdf', 'md'] as const).map((fmt) => (
                        <button
                            key={fmt}
                            onClick={() => handleExport(fmt)}
                            className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-dark-700 hover:text-white transition-colors flex items-center justify-between"
                        >
                            <span>{EXPORT_LABELS[fmt]}</span>
                            {/* Visual lock for paywalled formats if not pro */}
                            {!isPro && (fmt === 'pdf' || fmt === 'md') && (
                                <Lock size={14} className="text-yellow-500" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div >
    )
}
