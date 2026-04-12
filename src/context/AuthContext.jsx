import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('perfumehub_user');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const [isAdmin, setIsAdmin] = useState(() => {
        const savedIsAdmin = localStorage.getItem('perfumehub_isAdmin');
        return savedIsAdmin ? JSON.parse(savedIsAdmin) : false;
    });

    const [isVendor, setIsVendor] = useState(() => {
        const savedIsVendor = localStorage.getItem('perfumehub_isVendor');
        return savedIsVendor ? JSON.parse(savedIsVendor) : false;
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

    useEffect(() => {
        localStorage.setItem('perfumehub_isVendor', JSON.stringify(isVendor));
    }, [isVendor]);

    const login = async (email, password) => {
        try {
            // Hardcoded admin check for local simulation, or handle via backend roles
            if (email === 'admin@perfumehub.com' && password === 'admin123') {
                const adminUser = { id: 39, email, name: 'Admin User', role: 'super_admin' };
                setUser(adminUser);
                setIsAdmin(true);
                setIsVendor(false);
                return { success: true, user: adminUser };
            }

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Fetch full user data to get role and shop info
                const userResponse = await fetch(`/api/users/${data.user.id}`);
                const fullUser = userResponse.ok ? await userResponse.json() : data.user;

                setUser(fullUser);
                setIsAdmin(fullUser.role === 'admin' || data.user.email === 'admin@perfumehub.com');
                setIsVendor(fullUser.role === 'vendor');
                return { success: true, user: fullUser };
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
        setIsVendor(false);
    };

    const value = {
        user,
        isAuthenticated: !!user,
        isAdmin,
        isVendor,
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
