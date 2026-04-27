import { RefreshCcw, Menu, ChevronLeft } from 'lucide-react'

interface MobileBottomNavProps {
    onRegenerate: () => void
    loading: boolean
    hasResult: boolean
    isSidebarOpen: boolean
    onToggleSidebar: () => void
}

export default function MobileBottomNav({
    onRegenerate,
    loading,
    hasResult,
    isSidebarOpen,
    onToggleSidebar,
}: MobileBottomNavProps) {
    if (!hasResult && !loading) return null

    return (
        <>
            {/* Spacer to prevent content overlap on mobile */}
            <div className="h-20 md:hidden" />
            
            <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
                <div className="mx-3 mb-3 pb-safe">
                    <div className="bg-dark-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl p-2 flex flex-wrap items-center justify-between gap-2 relative">

                    <div className="flex flex-wrap items-center gap-2 relative z-10 w-full justify-between">
                        <button
                            onClick={onToggleSidebar}
                            className="p-3 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-xl text-white transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-500/70"
                            title="Menu"
                        >
                            {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={onRegenerate}
                                disabled={loading}
                                className="p-3 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-xl text-white transition-all active:scale-95 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-500/70"
                                title="Regenerate"
                            >
                                <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            </button>

                        </div>
                    </div>
                </div>
                </div>
            </div>
        </>
    )
}
