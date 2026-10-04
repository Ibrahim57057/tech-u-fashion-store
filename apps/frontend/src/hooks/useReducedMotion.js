import { useSyncExternalStore } from 'react';

const mediaQuery = '(prefers-reduced-motion: reduce)';

function subscribe(onStoreChange) {
    const query = window.matchMedia(mediaQuery);
    query.addEventListener('change', onStoreChange);
    return () => query.removeEventListener('change', onStoreChange);
}

function getSnapshot() {
    return window.matchMedia(mediaQuery).matches;
}

function getServerSnapshot() {
    return false;
}

export function useReducedMotion() {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
