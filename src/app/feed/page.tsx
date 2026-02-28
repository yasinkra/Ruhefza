"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { CreatePost } from "@/components/feed/CreatePost";
import { PostList } from "@/components/feed/PostList";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Filter, Info, Search, Flame, Clock, Megaphone, Plus, Sparkles, TrendingUp, Presentation } from "lucide-react";
import { cn } from "@/utils/cn";
import { createClient } from "@/utils/supabase/client";
import { useEffect } from "react";

export default function FeedPage() {
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortOption, setSortOption] = useState("recent");
    const [isExpert, setIsExpert] = useState<boolean>(false);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [announcement, setAnnouncement] = useState<{ message: string, active: boolean } | null>(null);

    const categories = ["Genel", "Soru", "Tavsiye", "Materyal", "Etkinlik", "Başarı Hikayesi"];

    useEffect(() => {
        const checkExpertStatus = async () => {
            const { data: { user } } = await createClient().auth.getUser();
            if (user) {
                const { data } = await createClient()
                    .from("profiles")
                    .select("role, is_verified_expert, verification_status")
                    .eq("id", user.id)
                    .single();

                if (data) {
                    const isVerifiedTeacher = data.role === 'teacher' && (data.is_verified_expert || data.verification_status === 'approved');
                    const isStudent = data.role === 'student';
                    if (isVerifiedTeacher || isStudent) setIsExpert(true);
                }
            }
            setLoadingProfile(false);
        };
        const fetchAnnouncement = async () => {
            const { data } = await createClient()
                .from("system_settings")
                .select("announcement_message, is_announcement_active")
                .eq("id", 'global')
                .single();
            if (data && data.is_announcement_active) {
                setAnnouncement({ message: data.announcement_message, active: data.is_announcement_active });
            }
        };

        checkExpertStatus();
        fetchAnnouncement();
    }, []);

    const handlePostCreated = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <AppShell>
            <div className="max-w-2xl mx-auto pb-20 sm:pb-0">
                {/* Announcement Banner */}
                {announcement?.active && (
                    <div className="mb-5 p-3.5 rounded-2xl gradient-brand text-white shadow-lg shadow-teal-200/30 flex items-center gap-3 animate-fade-up">
                        <div className="bg-white/20 p-2 rounded-xl shrink-0">
                            <Megaphone className="h-4 w-4" />
                        </div>
                        <p className="font-medium text-sm leading-snug">{announcement.message}</p>
                    </div>
                )}

                {/* Highlights / Stories */}
                <div className="flex gap-3 overflow-x-auto scrollbar-hide mb-6 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div className="shrink-0 w-[140px] sm:w-[160px] h-24 rounded-2xl p-3 bg-gradient-to-br from-amber-400 to-orange-500 text-white flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform shadow-md shadow-orange-200/50">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                            <Sparkles className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-sm leading-tight mt-2">Haftanın En İyileri</span>
                    </div>
                    <div className="shrink-0 w-[140px] sm:w-[160px] h-24 rounded-2xl p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform shadow-md shadow-indigo-200/50">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-sm leading-tight mt-2">Otizm Gündemi</span>
                    </div>
                    <div className="shrink-0 w-[140px] sm:w-[160px] h-24 rounded-2xl p-3 bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform shadow-md shadow-teal-200/50">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                            <Presentation className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-sm leading-tight mt-2">Uzmanlara Sorduk</span>
                    </div>
                </div>

                {/* Page Header */}
                <div className="flex items-center justify-between mb-5">
                    <h1 className="text-xl font-bold text-stone-800">Topluluk Akışı</h1>
                    <Select value={sortOption} onValueChange={setSortOption}>
                        <SelectTrigger className="w-[140px] bg-white border-stone-200 rounded-xl h-9 text-xs font-medium">
                            <SelectValue placeholder="Sıralama" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="recent">
                                <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-stone-400" /> En Yeniler</div>
                            </SelectItem>
                            <SelectItem value="popular">
                                <div className="flex items-center gap-2"><Flame className="h-3.5 w-3.5 text-orange-500" /> Popüler</div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <Input
                        placeholder="Gönderilerde ara..."
                        className="pl-10 bg-white border-stone-200 rounded-xl h-11 text-sm focus-visible:ring-teal-500/30 focus-visible:border-teal-400 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 mb-6 -mx-1 px-1">
                    <Filter className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                    <Badge
                        variant={selectedCategory === null ? "default" : "outline"}
                        className={cn(
                            "cursor-pointer shrink-0 transition-all duration-200 rounded-lg px-3 py-1.5 text-xs font-medium",
                            selectedCategory === null
                                ? "bg-stone-800 hover:bg-stone-700 text-white border-0"
                                : "text-stone-600 hover:bg-stone-100 border-stone-200 bg-white"
                        )}
                        onClick={() => setSelectedCategory(null)}
                    >
                        Tümü
                    </Badge>
                    {categories.map((cat) => (
                        <Badge
                            key={cat}
                            variant={selectedCategory === cat ? "default" : "outline"}
                            className={cn(
                                "cursor-pointer shrink-0 transition-all duration-200 rounded-lg px-3 py-1.5 text-xs font-medium",
                                selectedCategory === cat
                                    ? "bg-teal-600 hover:bg-teal-700 text-white border-0 shadow-sm shadow-teal-200/50"
                                    : "text-stone-600 hover:bg-stone-100 border-stone-200 bg-white"
                            )}
                            onClick={() => setSelectedCategory(cat)}
                        >
                            {cat}
                        </Badge>
                    ))}
                </div>

                {/* Create Post or Info Banner */}
                {!loadingProfile && isExpert ? (
                    <CreatePost onPostCreated={handlePostCreated} />
                ) : !loadingProfile ? (
                    <div className="mb-6 p-4 rounded-2xl border border-teal-100 bg-teal-50/50 flex items-start gap-3 animate-fade-up">
                        <div className="bg-white p-2 rounded-xl shadow-sm shrink-0">
                            <Info className="h-4 w-4 text-teal-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-stone-800 mb-0.5">Bilgi Kirliliğini Önlemek İçin</h3>
                            <p className="text-xs text-stone-600 leading-relaxed">
                                Bu platformda yalnızca onaylı uzmanlar paylaşım yapabilir. Ebeveynler uzmanların deneyimlerinden güvenle faydalanabilir.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="mb-6 h-[100px] rounded-2xl border border-stone-100 bg-stone-50 animate-pulse" />
                )}

                <PostList
                    refreshTrigger={refreshTrigger}
                    categoryFilter={selectedCategory}
                    searchQuery={searchQuery}
                    sortOption={sortOption}
                />

                {/* Mobile FAB for Creating Post */}
                {!loadingProfile && isExpert && (
                    <div className="fixed sm:hidden bottom-20 right-4 z-40 animate-fade-up">
                        <button
                            onClick={() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                // Focus or highlight the create post area in real implementation
                            }}
                            className="flex items-center justify-center w-14 h-14 bg-teal-600 text-white rounded-full shadow-lg shadow-teal-600/30 hover:bg-teal-700 hover:scale-105 active:scale-95 transition-all"
                        >
                            <Plus className="h-6 w-6" />
                        </button>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
