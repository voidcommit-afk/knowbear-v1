import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'

const AppPage = lazy(() => import('./pages/AppPage'))

export default function App() {
    return (
        <ErrorBoundary>
            <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}>
                <Routes>
                    <Route path="/" element={<AppPage />} />
                    <Route path="/app" element={<AppPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </ErrorBoundary>
    )
}
