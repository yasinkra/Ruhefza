"use client";

import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { ShieldAlert, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface AppShellProps {
    children: React.ReactNode;
    fullWidth?: boolean;
}

export function AppShell({ children, fullWidth = false }: AppShellProps) {
    const [isBanned, setIsBanned] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const checkBanStatus = async () => {
            const { data: { user } } = await createClient().auth.getUser();
            if (user) {
                const { data } = await createClient()
                    .from("profiles")
                    .select("is_banned")
                    .eq("id", user.id)
                    .single();

                if (data?.is_banned) {
                    setIsBanned(true);
                }
            }
            setLoading(false);
        };
        checkBanStatus();
    }, []);

    const handleLogout = async () => {
        await createClient().auth.signOut();
        router.push("/login");
    };

    if (!loading && isBanned) {
        return (
            <div className="fixed inset-0 bg-slate-900 z-[9999] flex items-center justify-center p-6 text-center">
                <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-300">
                    <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldAlert className="h-10 w-10 text-red-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Hesabınız Duraklatıldı</h1>
                    <p className="text-slate-600 mb-8 leading-relaxed">
                        Topluluk kurallarını ihlal ettiğiniz gerekçesiyle hesabınız yönetici tarafından kısıtlanmıştır. Bir hata olduğunu düşünüyorsanız lütfen destek ekibiyle iletişime geçin.
                    </p>
                    <Button
                        onClick={handleLogout}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white h-12 rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                        <LogOut className="h-5 w-5" />
                        Çıkış Yap
                    </Button>
                </div>
            </div>
        );
    }
    return (
        <div className="flex h-screen bg-stone-50 overflow-hidden">
            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative pb-16 md:pb-0">
                {fullWidth ? (
                    children
                ) : (
                    <div className="flex-1 overflow-y-auto">
                        <div className="container mx-auto max-w-5xl p-4 md:p-8">
                            {children}
                        </div>
                    </div>
                )}
            </main>

            {/* Mobile Bottom Nav */}
            <BottomNav />
        </div>
    );
}
