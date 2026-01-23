import { useState } from 'react';
import { X, Lock, Star } from 'lucide-react';
import { LoginButton } from './LoginButton';
import { openCheckout } from '../lib/razorpay';
import { useUsageGate } from '../hooks/useUsageGate';
import { useAuth } from '../context/AuthContext';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
    const { upgradeToPro } = useUsageGate();
    const [loading, setLoading] = useState(false);
    // We can infer the "reason" based on context or pass it in, but for MVP
    // a simple toggle or prop could work.
    // However, since useUsageGate triggers this, let's assume we want to support both.
    // For now, let's make it smart: if user is logged in but hits this, it's a paywall.
    // If user is guest, it's guest limit.
    // Ideally, pass 'mode' as prop or check auth state.

    // Let's assume passed usage context or just check auth here for mode switching
    // Actually, checking if user is logged in inside the modal is easiest if not passed.
    // But LoginButton is used for guests.

    // Let's add simple local state logic or props if we want to distinguish messages perfectly
    // without passed props. For now, we'll keep it generic or use a prop if we update call sites.
    // Since call sites (AppPage) just say isOpen, let's use the LoginButton presence as the differentiator.

    // BETTER: The component using this knows. Let's rely on internal content switching if we had auth context.

    // Refactor: We need useAuth to know if we show "Login" or "Upgrade"
    // We'll import useAuth.

    const handleUpgrade = () => {
        setLoading(true);
        openCheckout(
            () => {
                setLoading(false);
                upgradeToPro();
                onClose();
            },
            (err) => {
                setLoading(false);
                console.error(err);
                alert('Payment failed or cancelled');
            }
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 relative overflow-hidden">
                {/* Glow effect */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <UpgradeContent onUpgrade={handleUpgrade} loading={loading} />
            </div>
        </div>
    );
};

const UpgradeContent: React.FC<{ onUpgrade: () => void, loading: boolean }> = ({ onUpgrade, loading }) => {
    const { user } = useAuth(); // We need to move useAuth import up or pass it

    if (!user) {
        return (
            <div className="flex flex-col items-center text-center mt-2">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4 text-blue-400">
                    <Lock size={32} />
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">Guest Limit Reached</h2>
                <p className="text-gray-400 mb-6">
                    You've reached the free usage limit for guest users. Sign in to continue utilizing KnowBear without interruptions.
                </p>

                <div className="w-full">
                    <LoginButton className="w-full justify-center py-3 text-lg" />
                </div>

                <p className="mt-4 text-xs text-gray-500">
                    By signing in, you agree to our Terms of Service and Privacy Policy.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center text-center mt-2">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full flex items-center justify-center mb-4 text-white shadow-lg shadow-orange-500/30">
                <Star size={32} fill="currentColor" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Unlock Premium Features</h2>
            <p className="text-gray-400 mb-6">
                Exporting only available to Pro users. Upgrade now to unlock PDF/Markdown exports and unlimited usage.
            </p>

            <div className="w-full">
                <button
                    onClick={onUpgrade}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 text-lg font-bold bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-all disabled:opacity-50"
                >
                    {loading ? 'Processing...' : 'Upgrade to Pro - ₹499/mo'}
                </button>
            </div>

            <p className="mt-4 text-xs text-gray-500">
                Secure payment via Razorpay. Cancel anytime.
            </p>
        </div>
    );
};
