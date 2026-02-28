"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, MessageCircle, User, BookOpen, LogOut, Sparkles, LayoutDashboard, Bell } from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

const navigation = [
    { name: "Ana Sayfa", href: "/dashboard", icon: LayoutDashboard },
    { name: "Topluluk", href: "/feed", icon: Home },
    { name: "Mesajlar", href: "/messages", icon: MessageCircle },
    { name: "Bilgi Bankası", href: "/knowledge", icon: BookOpen },
    { name: "Bildirimler", href: "/notifications", icon: Bell },
    { name: "Profil", href: "/profile", icon: User },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        let mounted = true;

        const fetchUnreadCount = async () => {
            const { data: { user } } = await createClient().auth.getUser();
            if (!user) return;

            const { count, error } = await createClient()
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .neq('sender_id', user.id)
                .eq('is_read', false);

            if (!error && count !== null && mounted) {
                setUnreadCount(count);
            }
        };

        fetchUnreadCount();

        const { data: { subscription } } = createClient().auth.onAuthStateChange(() => {
            fetchUnreadCount();
        });

        const channel = createClient().channel('sidebar-unread')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'messages' },
                () => { fetchUnreadCount(); }
            )
            .subscribe();

        return () => {
            mounted = false;
            subscription.unsubscribe();
            createClient().removeChannel(channel);
        };
    }, []);

    const handleLogout = async () => {
        await createClient().auth.signOut();
        router.push("/login");
    };

    return (
        <div className="hidden md:flex h-full w-[280px] flex-col bg-white border-r border-[#F3F4F6] shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 relative">
            {/* Logo Area */}
            <div className="p-6 pb-2">
                <Link href="/dashboard" className="flex items-center gap-2.5 group">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#10B981] flex items-center justify-center shadow-lg shadow-teal-500/30 group-hover:shadow-teal-500/40 transition-shadow">
                        <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <span className="text-xl font-black text-gray-900 tracking-tight">
                            Ruhefza
                        </span>
                        <span className="text-[11px] block -mt-1 text-gray-500 font-medium">Eğitim Topluluğu</span>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-1">
                {navigation.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "group flex items-center gap-3.5 px-4 py-3.5 text-[15px] font-semibold rounded-2xl transition-all duration-300",
                                isActive
                                    ? "bg-[#0D9488] text-white shadow-lg shadow-teal-500/25"
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 active:scale-[0.98]"
                            )}
                        >
                            <div className="relative">
                                <item.icon
                                    className={cn(
                                        "h-5 w-5 flex-shrink-0 transition-colors duration-300",
                                        isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"
                                    )}
                                />
                                {item.name === "Mesajlar" && unreadCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white px-0.5">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </div>
                            <span>{item.name}</span>
                            {isActive && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-stone-100">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-xl h-11 font-medium transition-colors"
                    onClick={handleLogout}
                >
                    <LogOut className="mr-3 h-4.5 w-4.5" />
                    Çıkış Yap
                </Button>
            </div>
        </div>
    );
}
