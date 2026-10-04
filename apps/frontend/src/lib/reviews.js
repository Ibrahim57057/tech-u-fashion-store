const STORAGE_KEY = 'techu.reviews';
const EVENT_NAME = 'techu:reviews-change';

let cache = null;

function readFromStorage() {
    try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function getStore() {
    if (cache === null) cache = readFromStorage();
    return cache;
}

export function getRatings() {
    return getStore();
}

export function subscribe(onStoreChange) {
    window.addEventListener(EVENT_NAME, onStoreChange);
    window.addEventListener('storage', onStoreChange);
    return () => {
        window.removeEventListener(EVENT_NAME, onStoreChange);
        window.removeEventListener('storage', onStoreChange);
    };
}

export function rateProduct(productId, value) {
    const next = { ...getStore(), [productId]: value };
    cache = next;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        /* private browsing or quota — the rating still applies this session */
    }
    window.dispatchEvent(new Event(EVENT_NAME));
}
