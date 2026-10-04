/** Format an integer kobo amount as Naira, e.g. 4500000 -> "₦ 45,000". */
export function formatNaira(kobo) {
    return `₦ ${Math.round(kobo / 100).toLocaleString('en-NG')}`;
}