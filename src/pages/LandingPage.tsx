import { motion } from 'framer-motion'
import { Github } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen landing-root text-white selection:bg-cyan-400/30">
            <div className="landing-bg">
                <div className="ambient-orb orb-one" />
                <div className="ambient-orb orb-two" />
                <div className="landing-grid" />
                <div className="landing-noise" />
            </div>

            <main className="relative z-10 min-h-screen px-4 md:px-10">
                <div className="max-w-4xl mx-auto pt-[22vh] pb-16 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="mx-auto max-w-3xl"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs uppercase tracking-[0.24em] text-gray-300">
                            KnowBear
                        </div>
                        <h1 className="mt-5 text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-tight">
                            Learn anything, at your level.
                        </h1>
                        <p className="mt-4 text-gray-300 text-base sm:text-lg">
                            A focused explanation workspace for fast and deep learning.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.6, ease: 'easeOut' }}
                        className="mt-8"
                    >
                        <button
                            type="button"
                            onClick={() => navigate('/app')}
                            className="landing-cta w-full sm:w-auto mx-auto"
                        >
                            Open App
                        </button>
                    </motion.div>
                    <footer className="mt-16 text-sm text-gray-400">
                        <a
                            href="https://github.com/voidcommit-afk/knowbear-web"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 hover:text-cyan-300 transition-colors"
                        >
                            <Github className="w-4 h-4" />
                            GitHub Repository
                        </a>
                    </footer>
                </div>
            </main>
        </div>
    )
}
