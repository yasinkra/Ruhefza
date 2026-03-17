"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, MessageCircle, Bell, Search } from "lucide-react";
import { cn } from "@/utils/cn";
import { createClient } from "@/utils/supabase/client";

interface MobileHeaderProps {
    onOpenMenu: () => void;
}

export function MobileHeader({ onOpenMenu }: MobileHeaderProps) {
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const fetchUnread = async () => {
            const { data: { user } } = await createClient().auth.getUser();
            if (!user) return;

            // Messages
            const { count: msgCount } = await createClient()
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .neq('sender_id', user.id)
                .eq('is_read', false);
            
            setUnreadMessages(msgCount || 0);

            // Notifications (Placeholder for now, assuming a notifications table exists)
            // const { count: notifCount } = await createClient()
            //     .from('notifications')
            //     .select('*', { count: 'exact', head: true })
            //     .eq('is_read', false);
            // setUnreadNotifications(notifCount || 0);
        };

        fetchUnread();
        
        // Scroll behavior
        const scrollContainer = document.getElementById('app-main-content');
        if (!scrollContainer) return;

        const handleScroll = () => {
            const currentScrollY = scrollContainer.scrollTop;
            if (currentScrollY < 50) {
                setIsVisible(true);
            } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
                setIsVisible(false);
            } else if (currentScrollY < lastScrollY - 10) {
                setIsVisible(true);
            }
            setLastScrollY(currentScrollY);
        };

        scrollContainer.addEventListener('scroll', handleScroll);
        return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    return (
        <header className={cn(
            "fixed top-0 left-0 right-0 z-50 transition-all duration-300 xl:hidden",
            isVisible ? "translate-y-0" : "-translate-y-full"
        )}>
            <div className="bg-white/95 backdrop-blur-md border-b border-gray-100/80 px-4 h-16 flex items-center justify-between shadow-sm">
                {/* Left: Hamburger */}
                <button 
                    onClick={onOpenMenu}
                    className="p-2 -ml-2 text-gray-500 hover:text-gray-900 active:scale-95 transition-all"
                >
                    <Menu className="w-6 h-6" />
                </button>

                {/* Center: Branding */}
                <Link href="/feed" className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 group">
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden shadow-sm border border-gray-100 group-active:scale-95 transition-transform">
                        <Image src="/logo.png" alt="Logo" fill className="object-cover" />
                    </div>
                    <span className="font-bold text-gray-900 tracking-tight text-lg">Ruhefza</span>
                </Link>

                {/* Right: Actions */}
                <div className="flex items-center gap-1">
                    <button className="p-2 text-gray-500 hover:text-gray-900 active:scale-95 transition-all">
                        <Search className="w-5 h-5" />
                    </button>
                    <Link href="/messages" className="p-2 text-gray-500 hover:text-gray-900 active:scale-95 transition-all relative">
                        <MessageCircle className="w-5 h-5" />
                        {unreadMessages > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-[8px] font-bold text-white flex items-center justify-center rounded-full border-2 border-white ring-red-500 ring-offset-2">
                                {unreadMessages > 9 ? '9+' : unreadMessages}
                            </span>
                        )}
                    </Link>
                    <Link href="/notifications" className="p-2 text-gray-500 hover:text-gray-900 active:scale-95 transition-all relative">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                    </Link>
                </div>
            </div>
        </header>
    );
}
