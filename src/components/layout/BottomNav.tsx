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
                .eq('receiver_id', user.id)
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
                () => {
                    fetchUnreadCount();
                }
            )
            .subscribe();

        return () => {
            mounted = false;
            subscription.unsubscribe();
            createClient().removeChannel(channel);
        };
    }, []);

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-slate-200 bg-white md:hidden shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
            {navigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                    <Link
                        key={item.name}
                        href={item.href}
                        className="flex flex-col items-center justify-center w-full h-full"
                    >
                        <div className={cn(
                            "flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all relative",
                            isActive ? "text-sky-600" : "text-slate-500 hover:text-slate-900"
                        )}>
                            <div className="relative">
                                <item.icon
                                    className={cn(
                                        "h-6 w-6 transition-transform hover:scale-110",
                                        isActive && "fill-current"
                                    )}
                                />
                                {item.name === "Mesajlar" && unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white shadow-sm ring-2 ring-white">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] font-medium">{item.name}</span>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
