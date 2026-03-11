"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Home, MessageCircle, User, BookOpen, LogOut, Sparkles, Bell, Search } from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

const navigation = [
    { name: "Ana Sayfa", href: "/feed", icon: Home },
    { name: "Uzmanlar", href: "/experts", icon: Sparkles },
    { name: "Mesajlar", href: "/messages", icon: MessageCircle },
    { name: "Bilgi Bankası", href: "/knowledge", icon: BookOpen },
    { name: "Bildirimler", href: "/notifications", icon: Bell },
    { name: "Profil", href: "/profile", icon: User },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [unreadCount, setUnreadCount] = useState(0);
    const [userName, setUserName] = useState("");
    const [userRole, setUserRole] = useState("");

    useEffect(() => {
        let mounted = true;

        const fetchUserData = async () => {
            const { data: { user } } = await createClient().auth.getUser();
            if (!user) return;

            // Fetch unread messages
            const { count, error } = await createClient()
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .neq('sender_id', user.id)
                .eq('is_read', false);

            if (!error && count !== null && mounted) {
                setUnreadCount(count);
            }

            // Fetch user profile
            const { data: profile } = await createClient()
                .from('profiles')
                .select('full_name, role')
                .eq('id', user.id)
                .single();

            if (profile && mounted) {
                setUserName(profile.full_name || '');
                setUserRole(profile.role || '');
            }
        };

        fetchUserData();

        const { data: { subscription } } = createClient().auth.onAuthStateChange(() => {
            fetchUserData();
        });

        const channel = createClient().channel('sidebar-unread')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'messages' },
                () => { fetchUserData(); }
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

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'parent': return 'Ebeveyn';
            case 'teacher': return 'Öğretmen';
            case 'student': return 'Öğrenci';
            default: return 'Üye';
        }
    };

    return (
        <div className="hidden md:flex h-full w-[260px] flex-col bg-white border-r border-gray-100 z-10 relative">
            {/* Logo Area */}
            <div className="p-5 pb-2">
                <Link href="/feed" className="flex items-center gap-2.5 group">
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-md shadow-[#0c9789]/20 group-hover:shadow-[#0c9789]/30 transition-shadow">
                        <Image
                            src="/logo.png"
                            alt="Ruhefza Logo"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div>
                        <span className="text-lg font-bold text-gray-900 tracking-tight">
                            Ruhefza
                        </span>
                        <span className="text-[10px] block -mt-0.5 text-gray-400 font-medium">Özel Eğitim Platformu</span>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-0.5">
                {navigation.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "group flex items-center gap-3 px-3.5 py-2.5 text-[14px] font-medium rounded-lg transition-all duration-200",
                                isActive
                                    ? "bg-[#0c9789] text-white shadow-md shadow-[#0c9789]/25"
                                    : "text-gray-600 hover:bg-[#f0fdfa] hover:text-[#0c9789] active:scale-[0.98]"
                            )}
                        >
                            <div className="relative">
                                <item.icon
                                    className={cn(
                                        "h-[18px] w-[18px] flex-shrink-0 transition-colors duration-200",
                                        isActive ? "text-white" : "text-gray-400 group-hover:text-[#0c9789]"
                                    )}
                                />
                                {item.name === "Mesajlar" && unreadCount > 0 && (
                                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white px-0.5">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </div>
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* User Profile Card */}
            {userName && (
                <div className="mx-3 mb-2 p-3 rounded-lg bg-[#f0fdfa] border border-[#0c9789]/10">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#0c9789]/15 flex items-center justify-center">
                            <User className="w-4 h-4 text-[#0c9789]" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                            <p className="text-[11px] text-[#0c9789] font-medium">{getRoleLabel(userRole)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Logout */}
            <div className="p-3 border-t border-gray-100">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg h-10 text-sm font-medium transition-colors"
                    onClick={handleLogout}
                >
                    <LogOut className="mr-2.5 h-4 w-4" />
                    Çıkış Yap
                </Button>
            </div>
        </div>
    );
}
