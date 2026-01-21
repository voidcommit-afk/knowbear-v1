import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function LandingPage() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-black text-white px-4 relative overflow-hidden flex flex-col items-center justify-center">
            {/* Starry Background */}
            <div className="stars"></div>
            <div className="stars stars-2"></div>

            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-900/10 to-black pointer-events-none" />

            <div className="relative z-10 max-w-4xl w-full text-center space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="flex flex-col items-center gap-6"
                >
                    <div className="relative">
                        <img
                            src="/favicon.svg"
                            alt="KnowBear Logo"
                            className="w-32 h-32 md:w-40 md:h-40 drop-shadow-[0_0_30px_rgba(6,182,212,0.6)] animate-pulse-slow"
                        />
                        <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full -z-10"></div>
                    </div>

                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter">
                        Know<span className="text-cyan-500 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Bear</span>
                    </h1>

                    <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto leading-loose mt-12">
                        The Universal Knowledge Engine. <br />
                        <span className="text-cyan-200">Explained simply, deeply, or however you need it.</span>
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="flex flex-col md:flex-row items-center justify-center gap-4 mt-12"
                >
                    <button
                        onClick={() => navigate('/app')}
                        className="group relative px-8 py-4 bg-cyan-600 hover:bg-cyan-500 rounded-full font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(8,145,178,0.4)]"
                    >
                        <span className="flex items-center gap-2">
                            Get Started
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </span>
                    </button>

                    <button className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-white hover:bg-gray-50 text-gray-900 rounded-full font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        <span>Sign in with Google</span>
                    </button>
                </motion.div>
            </div>
        </div>
    )
}
