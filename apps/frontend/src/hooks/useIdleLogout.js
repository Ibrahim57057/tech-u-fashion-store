import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth.js';

const IDLE_LIMIT_MS = 15 * 60 * 1000; // 15 minutes of no activity

export function useIdleLogout() {
    const { isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const timerRef = useRef(null);

    useEffect(() => {
        if (!isAuthenticated) return;

        function resetTimer() {
            clearTimeout(timerRef.current);
            timerRef.current = setTimeout(async () => {
                await logout();
                navigate('/login');
            }, IDLE_LIMIT_MS);
        }

        const events = ['mousemove', 'keydown', 'click', 'scroll'];
        events.forEach((event) => window.addEventListener(event, resetTimer));
        resetTimer();

        return () => {
            clearTimeout(timerRef.current);
            events.forEach((event) => window.removeEventListener(event, resetTimer));
        };
    }, [isAuthenticated, logout, navigate]);
}