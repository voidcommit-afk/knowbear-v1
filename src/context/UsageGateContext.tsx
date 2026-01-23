import { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGuestMode } from '../hooks/useGuestMode';

export type ActionType = 'search' | 'export_data' | 'premium_mode';

export interface UsageGateContextType {
    checkAction: (action: ActionType, mode?: string) => { allowed: boolean; downgraded?: boolean };
    recordAction: (action: ActionType, mode?: string) => void;
    showPremiumModal: boolean;
    setShowPremiumModal: (show: boolean) => void;
    upgradeToPro: () => void;
    isPro: boolean;
    deepDiveUsageCount: number;
    deepDiveLimit: number;
}

const UsageGateContext = createContext<UsageGateContextType | undefined>(undefined);

export function UsageGateProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const guestMode = useGuestMode();
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [deepDiveUsageCount, setDeepDiveUsageCount] = useState(() => {
        const stored = localStorage.getItem('deep_dive_usage');
        return stored ? parseInt(stored, 10) : 0;
    });
    const [hasSeenLimitPopup, setHasSeenLimitPopup] = useState(false);

    const DEEP_DIVE_LIMIT = 5;

    // For MVP, simplistic check
    const isPro = localStorage.getItem('knowbear_pro_status') === 'true';

    const checkAction = (
        action: ActionType,
        mode: string = 'fast'
    ): { allowed: boolean; downgraded?: boolean } => {
        // PRO users bypass all limits
        if (isPro) {
            return { allowed: true };
        }

        // HARD GATED Features
        if (action === 'premium_mode' || action === 'export_data') {
            setShowPremiumModal(true);
            return { allowed: false };
        }

        // SEARCH logic
        if (action === 'search') {
            // Guest check (Global Limit)
            if (!user) {
                if (guestMode.checkLimit()) {
                    // guest mode hook handles its own modal
                    return { allowed: false };
                }
            }

            // Soft Gate: Deep Dive
            if (mode === 'deep_dive') {
                if (deepDiveUsageCount >= DEEP_DIVE_LIMIT) {
                    if (!hasSeenLimitPopup) {
                        setShowPremiumModal(true);
                        setHasSeenLimitPopup(true);
                    }
                    return { allowed: true, downgraded: true };
                }
            }
        }

        return { allowed: true };
    };

    const recordAction = (action: ActionType, mode: string = 'fast') => {
        if (action === 'search') {
            if (!user) {
                guestMode.incrementUsage();
            }
            if (mode === 'deep_dive' && !isPro) {
                const newCount = deepDiveUsageCount + 1;
                setDeepDiveUsageCount(newCount);
                localStorage.setItem('deep_dive_usage', newCount.toString());
            }
        }
    };

    const upgradeToPro = () => {
        localStorage.setItem('knowbear_pro_status', 'true');
        window.location.reload();
    };

    return (
        <UsageGateContext.Provider value={{
            checkAction,
            recordAction,
            showPremiumModal,
            setShowPremiumModal,
            upgradeToPro,
            isPro,
            deepDiveUsageCount,
            deepDiveLimit: DEEP_DIVE_LIMIT
        }}>
            {children}
        </UsageGateContext.Provider>
    );
}

export const useUsageGateContext = () => {
    const context = useContext(UsageGateContext);
    if (!context) {
        throw new Error('useUsageGateContext must be used within a UsageGateProvider');
    }
    return context;
};
