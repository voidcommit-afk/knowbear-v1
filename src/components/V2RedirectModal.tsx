import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ExternalLink, X, Zap } from 'lucide-react'

interface V2RedirectModalProps {
    v2Url?: string
}

export default function V2RedirectModal({ v2Url = "https://knowbear.app" }: V2RedirectModalProps) {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const hasSeenModal = localStorage.getItem('knowbear-v2-notified')
        if (!hasSeenModal) {
            const timer = setTimeout(() => setIsVisible(true), 1500)
            return () => clearTimeout(timer)
        }
    }, [])

    const handleDismiss = () => {
        localStorage.setItem('knowbear-v2-notified', 'true')
        setIsVisible(false)
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleDismiss}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.1)] p-8 sm:p-10"
                    >
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            <div className="absolute -inset-[100%] bg-gradient-to-tr from-transparent via-cyan-500/5 to-transparent animate-shimmer" 
                                 style={{ animationDuration: '3s' }} 
                            />
                        </div>

                        {/* Top Accent */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

                        <button 
                            onClick={handleDismiss}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="relative flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6">
                                <Zap className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                            </div>

                            <motion.h2 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-3xl font-black tracking-tight text-white mb-4"
                            >
                                KnowBear <span className="text-cyan-400">v2</span> is here
                            </motion.h2>

                            <motion.p 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-zinc-400 text-lg leading-relaxed mb-10 max-w-[340px]"
                            >
                                Experience the next generation of intelligence. Faster synthesis, cleaner design, and all-new RAG engine.
                            </motion.p>

                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="flex flex-col sm:flex-row items-center gap-4 w-full"
                            >
                                <a
                                    href={v2Url}
                                    className="group relative flex items-center justify-center gap-2 w-full py-4 px-6 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)] hover:-translate-y-0.5"
                                >
                                    Try v2 Platform
                                    <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </a>
                                <button
                                    onClick={handleDismiss}
                                    className="w-full sm:w-auto py-4 px-8 text-zinc-500 hover:text-white font-semibold transition-colors"
                                >
                                    Stay on v1
                                </button>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
