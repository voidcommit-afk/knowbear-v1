import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'


const LandingPage = lazy(() => import('./pages/LandingPage'))
const AppPage = lazy(() => import('./pages/AppPage'))

export default function App() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/app" element={<AppPage />} />
            </Routes>
        </Suspense>
    )
}
