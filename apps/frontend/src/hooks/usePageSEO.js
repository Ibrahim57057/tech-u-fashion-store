import { useEffect } from 'react';
import { setPageSEO } from '../lib/seo.js';

export function usePageSEO({ title, description, image }) {
    useEffect(() => {
        setPageSEO({ title, description, image });
    }, [title, description, image]);
}
