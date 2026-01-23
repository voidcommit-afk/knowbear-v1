import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGuestMode } from './useGuestMode';

export type ActionType = 'search' | 'export_pdf' | 'export_md';

export type GateResult = {
    allowed: boolean;
    reason?: 'guest_limit' | 'paywall';
    triggerGate: () => void;
};

export const useUsageGate = () => {
    const { user } = useAuth();
    const guestMode = useGuestMode();
    const [showPremiumModal, setShowPremiumModal] = useState(false);

    // For MVP, we check a session variable or local state for "pro" status
    // In a real app, this would check user.app_metadata.subscription_tier or similar
    // We'll simulate pro status if a specific check is passed (e.g., after successful mock payment)
    // For now, we'll store a temporary "isPro" in localStorage to simulate session persistence of the upgrade
    const isPro = localStorage.getItem('knowbear_pro_status') === 'true';

    const checkAction = (action: ActionType): boolean => {
        if (action === 'search') {
            if (!user) {
                // Guest mode fallback
                if (guestMode.checkLimit()) {
                    // guestMode.checkLimit() already triggers the guest upgrade modal inside the hook
                    // effectively 'allowed' is false, but the UI trigger handles it
                    return false;
                }
                return true;
            }
            // Logged in users have infinite search (for now)
            return true;
        }

        if (action === 'export_pdf' || action === 'export_md') {
            if (!isPro) {
                setShowPremiumModal(true);
                return false;
            }
            return true;
        }

        return true;
    };

    const recordAction = (action: ActionType) => {
        if (action === 'search' && !user) {
            guestMode.incrementUsage();
        }
    };

    const upgradeToPro = () => {
        localStorage.setItem('knowbear_pro_status', 'true');
        // Force re-render or state update might be needed in a real context, 
        // but for this simple hook, checking localStorage on render/action is okay for MVP
        // To be reactive, we should probably set a state, but let's keep it simple first
        window.location.reload(); // Simple way to refresh "Pro" state for MVP
    };

    return {
        checkAction,
        recordAction,
        showPremiumModal,
        setShowPremiumModal,
        upgradeToPro,
        isPro
    };
};
