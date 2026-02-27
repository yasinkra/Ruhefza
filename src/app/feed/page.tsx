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
import { Filter, Info, Search, Flame, Clock, Megaphone } from "lucide-react";
import { cn } from "@/utils/cn";
import { supabase } from "@/utils/supabase/client";
import { useEffect } from "react";

export default function FeedPage() {
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortOption, setSortOption] = useState("recent"); // "recent" or "popular"
    const [isExpert, setIsExpert] = useState<boolean>(false);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [announcement, setAnnouncement] = useState<{ message: string, active: boolean } | null>(null);

    const categories = ["Genel", "Soru", "Tavsiye", "Materyal", "Etkinlik", "Başarı Hikayesi"];

    useEffect(() => {
        const checkExpertStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from("profiles")
                    .select("role, is_verified_expert, verification_status")
                    .eq("id", user.id)
                    .single();

                if (data) {
                    const isVerifiedTeacher = data.role === 'teacher' && (data.is_verified_expert || data.verification_status === 'approved');
                    const isStudent = data.role === 'student';

                    if (isVerifiedTeacher || isStudent) {
                        setIsExpert(true);
                    }
                }
            }
            setLoadingProfile(false);
        };
        const fetchAnnouncement = async () => {
            const { data } = await supabase
                .from("system_settings")
                .select("announcement_message, is_announcement_active")
                .eq("id", 'global')
                .single();
            if (data && data.is_announcement_active) {
                setAnnouncement({
                    message: data.announcement_message,
                    active: data.is_announcement_active
                });
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
            <div className="max-w-2xl mx-auto py-6">
                {announcement?.active && (
                    <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md flex items-center gap-4 animate-in slide-in-from-top duration-500">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <Megaphone className="h-5 w-5" />
                        </div>
                        <div className="flex-1 font-medium text-sm">
                            {announcement.message}
                        </div>
                    </div>
                )}

                <h1 className="text-2xl font-bold text-slate-800 mb-6 px-1">Topluluk Akışı</h1>

                {/* Filters, Search and Sort Area */}
                <div className="mb-6 space-y-4">
                    {/* Search and Sort Row */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Gönderilerde ara..."
                                className="pl-9 bg-white border-slate-200 focus-visible:ring-sky-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Select value={sortOption} onValueChange={setSortOption}>
                            <SelectTrigger className="w-full sm:w-[180px] bg-white border-slate-200">
                                <SelectValue placeholder="Sıralama" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="recent">
                                    <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" /> En Yeniler</div>
                                </SelectItem>
                                <SelectItem value="popular">
                                    <div className="flex items-center gap-2"><Flame className="h-4 w-4 text-orange-500" /> Popüler</div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Category Badges */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar px-1">
                        <Filter className="h-4 w-4 text-slate-400 shrink-0 mr-1" />
                        <Badge
                            variant={selectedCategory === null ? "default" : "outline"}
                            className={cn(
                                "cursor-pointer shrink-0 transition-colors",
                                selectedCategory === null ? "bg-slate-800 hover:bg-slate-700" : "text-slate-600 hover:bg-slate-100 border-slate-200"
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
                                    "cursor-pointer shrink-0 transition-colors",
                                    selectedCategory === cat ? "bg-sky-500 hover:bg-sky-600" : "text-slate-600 hover:bg-slate-100 border-slate-200"
                                )}
                                onClick={() => setSelectedCategory(cat)}
                            >
                                {cat}
                            </Badge>
                        ))}
                    </div>
                </div>

                {!loadingProfile && isExpert ? (
                    <CreatePost onPostCreated={handlePostCreated} />
                ) : !loadingProfile ? (
                    <div className="mb-6 p-4 rounded-xl border border-sky-100 bg-sky-50 flex items-start gap-4 shadow-sm animate-in fade-in duration-500">
                        <div className="bg-white p-2 rounded-full shadow-sm shrink-0">
                            <Info className="h-5 w-5 text-sky-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 mb-1">Bilgi Kirliliğini Önlemek İçin</h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Bu platformda yalnızca onaylı uzmanlar (Eğitimciler, Akademisyenler, Terapistler) paylaşım yapabilir. Ebeveynler uzmanların deneyimlerinden güvenle faydalanabilir, gönderileri kaydedebilir ve filtreleyebilirler.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="mb-6 h-[100px] rounded-xl border border-slate-100 bg-slate-50 animate-pulse"></div>
                )}

                <PostList
                    refreshTrigger={refreshTrigger}
                    categoryFilter={selectedCategory}
                    searchQuery={searchQuery}
                    sortOption={sortOption}
                />
            </div>
        </AppShell>
    );
}
