import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import V2RedirectModal from './components/V2RedirectModal'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const AppPage = lazy(() => import('./pages/AppPage'))

export default function App() {
    return (
        <ErrorBoundary>
            <V2RedirectModal />
            <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/app" element={<AppPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </ErrorBoundary>
    )
}
