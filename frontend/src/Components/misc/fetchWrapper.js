let onSessionExpired = () => {};

export const setSessionExpiredHandler = (fn) => {
    onSessionExpired = fn;
};

export async function apiFetch(url, options = {}) {
    console.log('apiFetch', url);
    const response = await fetch(url, {
            ...options,
            headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (response.status === 401) {
        onSessionExpired(); // zentraler Aufruf
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Fetch error');
    }

    return response.json(); // oder .text(), .blob() usw.
}