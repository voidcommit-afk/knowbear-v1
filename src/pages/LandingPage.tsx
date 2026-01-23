import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { LoginButton } from '../components/LoginButton'

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

                    <LoginButton className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-white hover:bg-gray-50 text-gray-900 rounded-full font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]" />
                </motion.div>
            </div>
        </div>
    )
}
