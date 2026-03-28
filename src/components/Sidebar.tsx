import { ChevronLeft, ChevronRight, Github } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

interface SidebarProps {
    isOpen: boolean
    onToggle: () => void
    onSelectTopic: (topic: string) => void
}

const QUICK_TOPICS = [
    'Artificial Intelligence',
    'Quantum Computing',
    'Blockchain',
    'Climate Change',
    'Photosynthesis',
]

export default function Sidebar({ isOpen, onToggle, onSelectTopic }: SidebarProps) {
    const navigate = useNavigate()
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    return (
        <>
            <AnimatePresence>
                {isOpen && isMobile && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                        onClick={onToggle}
                    />
                )}
            </AnimatePresence>

            <motion.aside
                className={`fixed left-0 top-0 h-full bg-dark-900 border-r border-dark-700 transition-all duration-300 z-50 flex flex-col ${isOpen ? 'w-64 translate-x-0 shadow-2xl shadow-cyan-900/10' : 'w-64 -translate-x-full md:translate-x-0 md:w-16'}`}
                drag={isMobile && isOpen ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(_e, info) => {
                    if (isMobile && isOpen && (info.offset.x < -50 || info.velocity.x < -500)) {
                        onToggle()
                    }
                }}
            >
                <button
                    onClick={onToggle}
                    className="absolute -right-4 top-1/2 -translate-y-1/2 bg-dark-800 border border-dark-600 rounded-full p-1 text-gray-400 hover:text-white transition-colors hidden md:block"
                    aria-label={isOpen ? 'Close Sidebar' : 'Open Sidebar'}
                >
                    {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>

                <div className={`p-4 flex flex-wrap items-center gap-3 border-b border-dark-700 ${!isOpen && 'justify-center'}`}>
                    <button
                        onClick={() => navigate('/')}
                        className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded"
                        aria-label="Go to home"
                    >
                        <img src="/favicon.svg" alt="Logo" className="w-8 h-8 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]" />
                    </button>
                    {isOpen && <span className="text-white font-bold text-lg tracking-tight">Know<span className="text-cyan-500">Bear</span></span>}
                </div>

                <nav className="flex-grow overflow-y-auto custom-scrollbar p-3">
                    {isOpen ? (
                        <div className="space-y-2">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-1">Quick Topics</h3>
                            {QUICK_TOPICS.map((topic) => (
                                <button
                                    key={topic}
                                    onClick={() => onSelectTopic(topic)}
                                    className="w-full text-left px-3 py-2 text-sm rounded-lg text-gray-300 hover:bg-dark-800 hover:text-white transition-colors"
                                >
                                    {topic}
                                </button>
                            ))}
                        </div>
                    ) : null}
                </nav>

                <div className={`p-4 border-t border-dark-700 flex flex-wrap items-center ${isOpen ? 'justify-between' : 'justify-center'}`}>
                    {isOpen && <span className="text-[10px] text-gray-600 font-mono">Demo Mode</span>}
                    <a
                        href="https://github.com/voidcommit-afk/KnowBear-v1"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-cyan-400 transition-colors"
                        aria-label="GitHub repository"
                    >
                        <Github className="w-5 h-5" />
                    </a>
                </div>
            </motion.aside>
        </>
    )
}
