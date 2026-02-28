import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { Toaster } from "sonner";

export const metadata: Metadata = {
    title: "Cortensor Agentic Ops Hub (CAOH)",
    description:
        "Verifiable Multi-Agent DevOps & Community Orchestrator – every reasoning step delegated to the decentralized Cortensor Router with PoI verification.",
    keywords: ["Cortensor", "AI agents", "DevOps", "PoI", "LangGraph"],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossOrigin="anonymous"
                />
            </head>
            <body className="bg-background text-text-primary h-screen flex flex-col overflow-hidden" suppressHydrationWarning>
                {/* Animated scanline */}
                <div className="scanline" />

                {/* Top Bar */}
                <TopBar />

                {/* Main Layout */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <Sidebar />

                    {/* Page Content */}
                    <main className="flex-1 overflow-hidden cyber-grid">
                        {children}
                    </main>
                </div>

                <Toaster
                    theme="dark"
                    toastOptions={{
                        style: {
                            background: "#0f0f1a",
                            border: "1px solid #1a1a2e",
                            color: "#e2e8f0",
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "0.8rem",
                        },
                    }}
                />
            </body>
        </html>
    );
}
