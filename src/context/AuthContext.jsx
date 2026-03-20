import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const savedUser = localStorage.getItem('perfumehub_user');
            return savedUser ? JSON.parse(savedUser) : null;
        } catch (error) {
            console.error('Failed to parse user from localStorage:', error);
            return null;
        }
    });

    const [isAdmin, setIsAdmin] = useState(() => {
        try {
            const savedIsAdmin = localStorage.getItem('perfumehub_isAdmin');
            return savedIsAdmin ? JSON.parse(savedIsAdmin) : false;
        } catch (error) {
            console.error('Failed to parse isAdmin from localStorage:', error);
            return false;
        }
    });

    useEffect(() => {
        if (user) {
            localStorage.setItem('perfumehub_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('perfumehub_user');
        }
    }, [user]);

    useEffect(() => {
        localStorage.setItem('perfumehub_isAdmin', JSON.stringify(isAdmin));
    }, [isAdmin]);

    const login = async (email, password) => {
        try {
            // Hardcoded admin check for local simulation, or handle via backend roles
            if (email === 'admin@perfumehub.com' && password === 'admin123') {
                const adminUser = { email, name: 'Admin User' };
                setUser(adminUser);
                setIsAdmin(true);
                return { success: true };
            }

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                setUser(data.user);
                setIsAdmin(false);
                return { success: true };
            } else {
                return { success: false, message: data.error || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Could not connect to server' };
        }
    };

    const register = async (name, email, password) => {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                return { success: true };
            } else {
                return { success: false, message: data.error || 'Registration failed' };
            }
        } catch (error) {
            console.error('Registration error details:', error);
            return { success: false, message: 'Could not connect to server: ' + error.message };
        }
    };

    const logout = () => {
        setUser(null);
        setIsAdmin(false);
    };

    const value = {
        user,
        isAuthenticated: !!user,
        isAdmin,
        login,
        register,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
