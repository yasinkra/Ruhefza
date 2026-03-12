"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, User, BookOpen, Bell, Sparkles } from "lucide-react";
import { cn } from "@/utils/cn";
import { createClient } from "@/utils/supabase/client";

const navigation = [
    { name: "Akış", href: "/feed", icon: Home },
    { name: "Uzmanlar", href: "/experts", icon: Sparkles },
    { name: "Bilgi", href: "/knowledge", icon: BookOpen },
    { name: "Mesajlar", href: "/messages", icon: MessageCircle },
    { name: "Bildirim", href: "/notifications", icon: Bell },
    { name: "Profil", href: "/profile", icon: User },
];

export function BottomNav() {
    const pathname = usePathname();
    const [unreadCount, setUnreadCount] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

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

        // Keyboard/Focus Detection
        const handleFocusIn = (e: FocusEvent) => {
            const isInput = (e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA';
            if (isInput) {
                setIsVisible(false);
            }
        };

        const handleFocusOut = (e: FocusEvent) => {
            const isInput = (e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA';
            if (isInput) {
                setIsVisible(true);
            }
        };

        // Extra safety for iOS Viewport changes
        const handleViewportChange = () => {
            if (!window.visualViewport) return;
            const threshold = 100; // pixels
            const isKeyboardOpen = window.visualViewport.height < window.innerHeight - threshold;
            setIsVisible(!isKeyboardOpen);
        };

        document.addEventListener('focusin', handleFocusIn);
        document.addEventListener('focusout', handleFocusOut);
        window.visualViewport?.addEventListener('resize', handleViewportChange);

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
            document.removeEventListener('focusin', handleFocusIn);
            document.removeEventListener('focusout', handleFocusOut);
            window.visualViewport?.removeEventListener('resize', handleViewportChange);
            subscription.unsubscribe();
            createClient().removeChannel(channel);
        };
    }, []);

    return (
        <div className={cn(
            "fixed bottom-0 left-0 right-0 z-50 md:hidden",
            !isVisible && "hidden"
        )}>
            <div className="bg-white/95 backdrop-blur-xl border-t border-gray-100/60 shadow-[0_-8px_32px_rgba(0,0,0,0.06)]">
                <div
                    className="flex items-center justify-between h-[72px] px-2"
                    style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
                >
                    {navigation.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="flex flex-col items-center justify-center flex-1 h-full active:scale-90 transition-transform"
                            >
                                <div className={cn(
                                    "flex flex-col items-center justify-center gap-1 transition-all duration-200 relative",
                                    isActive ? "text-[#0c9789]" : "text-gray-400"
                                )}>
                                    <div className="relative flex items-center justify-center h-8 w-12">
                                        {isActive && (
                                            <div className="absolute inset-x-0 mx-auto w-12 h-full bg-[#0c9789]/8 rounded-full -z-10 animate-scale-in" />
                                        )}
                                        <item.icon
                                            className={cn(
                                                "h-[22px] w-[22px] transition-all duration-200",
                                                isActive && "text-[#0c9789]"
                                            )}
                                            strokeWidth={isActive ? 2.5 : 2}
                                        />
                                        {item.name === "Mesajlar" && unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white ring-2 ring-white px-0.5 animate-scale-in">
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    <span className={cn(
                                        "text-[10px] sm:text-[11px] transition-all duration-200 truncate px-0.5",
                                        isActive ? "font-bold text-[#0c9789]" : "font-medium"
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
