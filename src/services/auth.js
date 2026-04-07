export const login = async (nombre, password) => {
    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nombre, password }),
    });

    return res.json();
}