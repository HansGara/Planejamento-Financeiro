"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
    name: string;
}

interface AuthContextType {
    user: User | null;
    login: (name: string, pass: string) => boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('player_session');
        if (saved) setUser(JSON.parse(saved));
    }, []);

    const login = (name: string, pass: string) => {
        const validUsers = [
            { name: 'Vitor', pass: 'vitor123' },
            { name: 'Mariana', pass: 'mariana123' }
        ];

        const found = validUsers.find(u => u.name.toLowerCase() === name.toLowerCase() && u.pass === pass);
        if (found) {
            const sessionUser = { name: found.name };
            setUser(sessionUser);
            localStorage.setItem('player_session', JSON.stringify(sessionUser));
            return true;
        }
        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('player_session');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
