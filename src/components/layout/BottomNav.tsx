"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, User, BookOpen } from "lucide-react";
import { cn } from "@/utils/cn";
import { createClient } from "@/utils/supabase/client";

const navigation = [
    { name: "Akış", href: "/feed", icon: Home },
    { name: "Mesajlar", href: "/messages", icon: MessageCircle },
    { name: "Bilgi", href: "/knowledge", icon: BookOpen },
    { name: "Profil", href: "/profile", icon: User },
];

export function BottomNav() {
    const pathname = usePathname();
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

        const channel = createClient().channel('bottomnav-unread')
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

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
            {/* Glassmorphism bottom bar */}
            <div className="glass-nav border-t border-stone-200/50 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
                <div
                    className="flex items-center justify-around h-[72px]"
                    style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
                >
                    {navigation.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="flex flex-col items-center justify-center w-full h-full active:scale-95 transition-transform"
                            >
                                <div className={cn(
                                    "flex flex-col items-center justify-center gap-1 transition-all duration-200 relative",
                                    isActive ? "text-teal-600" : "text-stone-400"
                                )}>
                                    {/* Active pill background */}
                                    {isActive && (
                                        <div className="absolute -top-1.5 inset-x-0 mx-auto w-12 h-[30px] bg-teal-50 rounded-full -z-10 animate-scale-in" />
                                    )}
                                    <div className="relative">
                                        <item.icon
                                            className={cn(
                                                "h-[22px] w-[22px] transition-all duration-200",
                                                isActive && "text-teal-600"
                                            )}
                                            strokeWidth={isActive ? 2.5 : 1.8}
                                        />
                                        {item.name === "Mesajlar" && unreadCount > 0 && (
                                            <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white ring-2 ring-white px-0.5 animate-scale-in">
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    <span className={cn(
                                        "text-[10px] transition-all duration-200",
                                        isActive ? "font-semibold text-teal-700" : "font-medium"
                                    )}>
                                        {item.name}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
