import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { MobileHeader } from "./MobileHeader";
import { MobileSidebar } from "./MobileSidebar";
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
            <div className="fixed inset-0 bg-stone-900/95 z-[9999] flex items-center justify-center p-6 text-center">
                <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl animate-scale-in">
                    <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldAlert className="h-10 w-10 text-red-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-stone-900 mb-2">Hesabınız Duraklatıldı</h1>
                    <p className="text-stone-600 mb-8 leading-relaxed">
                        Topluluk kurallarını ihlal ettiğiniz gerekçesiyle hesabınız yönetici tarafından kısıtlanmıştır. Bir hata olduğunu düşünüyorsanız lütfen destek ekibiyle iletişime geçin.
                    </p>
                    <Button
                        onClick={handleLogout}
                        className="w-full bg-stone-900 hover:bg-stone-800 text-white h-12 rounded-xl font-semibold flex items-center justify-center gap-2"
                    >
                        <LogOut className="h-5 w-5" />
                        Çıkış Yap
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-dvh bg-stone-50 overflow-hidden">
            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Mobile Navigation */}
            <MobileHeader onOpenMenu={() => setIsMobileMenuOpen(true)} />
            <MobileSidebar 
                isOpen={isMobileMenuOpen} 
                onClose={() => setIsMobileMenuOpen(false)} 
                onLogout={handleLogout}
            />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {fullWidth ? (
                    <div id="app-main-content" className="flex-1 overflow-y-auto custom-scrollbar mt-16 xl:mt-0">
                        {children}
                    </div>
                ) : (
                    <div id="app-main-content" className="flex-1 overflow-y-auto custom-scrollbar mt-16 xl:mt-0">
                        <div className="container mx-auto max-w-2xl px-4 py-4 md:px-8 md:py-8 lg:max-w-4xl">
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
