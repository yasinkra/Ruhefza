"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, Search } from "lucide-react";
import { cn } from "@/utils/cn";
import { createClient } from "@/utils/supabase/client";

interface MobileHeaderProps {
    onOpenMenu: () => void;
}

export function MobileHeader({ onOpenMenu }: MobileHeaderProps) {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 xl:hidden">
            <div className="bg-white/95 backdrop-blur-md border-b border-gray-100/80 px-4 h-16 flex items-center justify-between shadow-sm relative">
                {/* Left: Hamburger & Branding */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={onOpenMenu}
                        className="p-2 -ml-2 text-gray-400 hover:text-gray-900 active:scale-95 transition-all z-10"
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    <Link href="/feed" className="flex items-center gap-2 group z-0">
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden shadow-sm border border-gray-100 group-active:scale-95 transition-transform">
                            <Image src="/logo.png" alt="Logo" fill className="object-cover" />
                        </div>
                        <span className="font-bold text-gray-900 tracking-tight text-lg">Ruhefza</span>
                    </Link>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-0.5 z-10">
                    <button className="p-2 text-gray-400 hover:text-gray-900 active:scale-95 transition-all">
                        <Search className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </header>
    );
}
