"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, MessageCircle, User, BookOpen, LogOut, Heart } from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

const navigation = [
    { name: "Akış", href: "/feed", icon: Home },
    { name: "Mesajlar", href: "/messages", icon: MessageCircle },
    { name: "Bilgi Bankası", href: "/knowledge", icon: BookOpen },
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

        // Optional: subscribe to new messages for real-time updates
        const channel = createClient().channel('sidebar-unread')
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

    const handleLogout = async () => {
        await createClient().auth.signOut();
        router.push("/login");
    };

    return (
        <div className="hidden md:flex h-full w-64 flex-col border-r border-slate-200 bg-white shadow-sm">
            <div className="p-6 flex items-center gap-2">
                <Heart className="h-6 w-6 text-sky-500 fill-sky-100" />
                <span className="text-xl font-bold text-slate-800 tracking-tight">
                    Ruhefza<span className="text-sky-600">App</span>
                </span>
            </div>
            <nav className="flex-1 space-y-1 px-4 py-4">
                {navigation.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                                isActive
                                    ? "bg-sky-50 text-sky-700"
                                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <div className="relative">
                                <item.icon
                                    className={cn(
                                        "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                                        isActive ? "text-sky-600" : "text-slate-500 group-hover:text-slate-600"
                                    )}
                                />
                                {item.name === "Mesajlar" && unreadCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </div>
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
            <div className="border-t border-slate-200 p-4">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={handleLogout}
                >
                    <LogOut className="mr-3 h-5 w-5" />
                    Çıkış Yap
                </Button>
            </div>
        </div>
    );
}
