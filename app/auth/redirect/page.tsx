"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function RedirectPage() {
    const { isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        if (!isLoading) {
            // Return to the page where sign-in started (set by the vault's signIn), else home.
            let back = "/";
            try { back = sessionStorage.getItem("sv-return") || "/"; sessionStorage.removeItem("sv-return"); } catch { /* private mode */ }
            if (!back.startsWith("/") || back.startsWith("//") || back.startsWith("/auth/")) back = "/";
            window.location.href = isAuthenticated ? back : "/";
        }
    }, [isLoading, isAuthenticated]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            color: '#555',
        }}>
            <p>Waiting for authentication...</p>
        </div>
    );
}
