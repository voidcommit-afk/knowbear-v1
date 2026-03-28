import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Zap, X } from 'lucide-react'

interface V2FloatingButtonProps {
    v2Url?: string
}

export default function V2FloatingButton({ v2Url = "https://knowbear.app" }: V2FloatingButtonProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [isDismissed, setIsDismissed] = useState(false)

    useEffect(() => {
        const dismissed = localStorage.getItem('knowbear-v2-floating-dismissed')
        if (!dismissed) {
            const timer = setTimeout(() => setIsVisible(true), 3000)
            return () => clearTimeout(timer)
        }
    }, [])

    const handleDismiss = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        localStorage.setItem('knowbear-v2-floating-dismissed', 'true')
        setIsDismissed(true)
    }

    return (
        <AnimatePresence>
            {isVisible && !isDismissed && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: 20 }}
                    className="fixed bottom-6 right-6 z-[100] group"
                >
                    <a
                        href={v2Url}
                        className="relative flex items-center gap-4 pl-4 pr-12 py-3 bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 hover:border-cyan-500/50 hover:bg-zinc-900/60 overflow-hidden"
                    >
                        {/* Shimmer on hover */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute -inset-[100%] bg-gradient-to-tr from-transparent via-cyan-500/10 to-transparent animate-shimmer" style={{ animationDuration: '3s' }} />
                        </div>

                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-cyan-400" />
                        </div>
                        
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-widest text-cyan-500/80 font-bold">Recommended</span>
                            <span className="text-sm font-bold text-white whitespace-nowrap">Try v2 Platform</span>
                        </div>

                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 group-hover:text-cyan-400 transition-colors">
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>

                        {/* Close button inside */}
                        <button 
                            onClick={handleDismiss}
                            className="absolute top-1 right-1 p-1 rounded-full hover:bg-white/10 text-zinc-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </a>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
