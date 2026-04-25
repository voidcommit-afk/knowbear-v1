import { Menu, X } from 'lucide-react'

interface MobileHeaderProps {
    isOpen: boolean
    onToggle: () => void
}

export default function MobileHeader({ isOpen, onToggle }: MobileHeaderProps) {
    return (
        <div className="md:hidden sticky top-0 z-40">
            <div className="bg-dark-900/80 backdrop-blur-xl border-b border-white/10">
                <div className="px-3 py-3 flex items-center justify-between">
                    <button
                        onClick={onToggle}
                        className="h-10 w-10 inline-flex items-center justify-center rounded-xl border border-dark-600 bg-dark-800 text-gray-200 hover:text-white hover:bg-dark-700 transition-colors"
                        aria-label={isOpen ? 'Close menu' : 'Open menu'}
                    >
                        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>

                    <div className="flex items-center gap-2">
                        <img
                            src="/favicon.svg"
                            alt="KnowBear"
                            className="w-6 h-6 drop-shadow-[0_0_6px_rgba(6,182,212,0.45)]"
                        />
                        <span className="text-sm font-semibold tracking-wide text-white">
                            Know<span className="text-cyan-400">Bear</span>
                        </span>
                    </div>

                    <div className="w-10" aria-hidden />
                </div>
            </div>
        </div>
    )
}
