"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, User, BookOpen, LogOut, Sparkles, Bell, X, ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";
import { createClient } from "@/utils/supabase/client";

const navigation = [
    { name: "Ana Sayfa", href: "/feed", icon: Home },
    { name: "Uzmanlar", href: "/experts", icon: Sparkles },
    { name: "Bilgi Bankası", href: "/knowledge", icon: BookOpen },
    { name: "Mesajlar", href: "/messages", icon: MessageCircle },
    { name: "Bildirimler", href: "/notifications", icon: Bell },
    { name: "Profil", href: "/profile", icon: User },
];

interface MobileSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onLogout: () => void;
}

export function MobileSidebar({ isOpen, onClose, onLogout }: MobileSidebarProps) {
    const pathname = usePathname();
    const [userData, setUserData] = useState<{ name: string, email: string, role: string } | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await createClient().auth.getUser();
            if (user) {
                const { data: profile } = await createClient()
                    .from('profiles')
                    .select('full_name, role')
                    .eq('id', user.id)
                    .single();
                
                setUserData({
                    name: profile?.full_name || 'Kullanıcı',
                    email: user.email || '',
                    role: profile?.role || 'Üye'
                });
            }
        };
        fetchUser();
    }, []);

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'parent': return 'Ebeveyn';
            case 'teacher': return 'Öğretmen';
            case 'student': return 'Öğrenci';
            default: return 'Üye';
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div 
                className={cn(
                    "fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm transition-opacity duration-300 lg:hidden",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar Drawer */}
            <div className={cn(
                "fixed inset-y-0 left-0 w-[80%] max-w-[320px] bg-white z-[70] shadow-2xl transition-transform duration-300 ease-out lg:hidden",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-2.5">
                                <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-sm border border-gray-100">
                                    <Image src="/logo.png" alt="Ruhefza Logo" fill className="object-cover" />
                                </div>
                                <span className="text-xl font-bold text-gray-900 tracking-tight">Ruhefza</span>
                            </div>
                            <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-900 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* User Info */}
                        {userData && (
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#0c9789]/5 border border-[#0c9789]/10">
                                <div className="w-12 h-12 rounded-full bg-[#0c9789] flex items-center justify-center text-white text-lg font-bold">
                                    {userData.name[0]}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-gray-900 truncate">{userData.name}</p>
                                    <p className="text-xs text-[#0c9789] font-medium">{getRoleLabel(userData.role)}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={onClose}
                                    className={cn(
                                        "flex items-center justify-between p-3.5 rounded-xl transition-all duration-200 group",
                                        isActive 
                                            ? "bg-[#0c9789]/8 text-[#0c9789]" 
                                            : "text-gray-600 hover:bg-gray-50 active:scale-[0.98]"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <item.icon className={cn(
                                            "w-5 h-5 transition-colors duration-200",
                                            isActive ? "text-[#0c9789]" : "text-gray-400 group-hover:text-gray-600"
                                        )} strokeWidth={isActive ? 2.5 : 2} />
                                        <span className={cn("text-sm transition-all", isActive ? "font-bold" : "font-medium")}>
                                            {item.name}
                                        </span>
                                    </div>
                                    <ChevronRight className={cn(
                                        "w-4 h-4 opacity-0 transition-all duration-200",
                                        isActive ? "opacity-100 translate-x-0" : "group-hover:opacity-100 -translate-x-1"
                                    )} />
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100">
                        <button 
                            onClick={() => { onLogout(); onClose(); }}
                            className="flex items-center gap-3 w-full p-3.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="text-sm font-bold">Çıkış Yap</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
