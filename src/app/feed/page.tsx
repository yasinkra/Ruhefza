"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
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
import { Filter, Info, Search, Flame, Clock, Megaphone, Plus, Sparkles, TrendingUp, Presentation, ChevronRight } from "lucide-react";
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
        <AppShell fullWidth>
            <div className="w-full max-w-[1440px] mx-auto flex flex-col lg:flex-row gap-6 xl:gap-10 px-4 md:px-8 py-6 md:py-10 pb-24 md:pb-10 min-h-screen">
                {/* Main Feed Column */}
                <div className="flex-1 flex flex-col gap-8 w-full min-w-0">
                    {/* Announcement Banner */}
                    {announcement?.active && (
                        <div className="mb-5 p-3.5 rounded-2xl gradient-brand text-white shadow-lg shadow-[#7b9e89]/30 flex items-center gap-3 animate-fade-up">
                            <div className="bg-white/20 p-2 rounded-xl shrink-0">
                                <Megaphone className="h-4 w-4" />
                            </div>
                            <p className="font-medium text-sm leading-snug">{announcement.message}</p>
                        </div>
                    )}

                    {/* Highlights / Stories */}
                    <div className="flex gap-3 overflow-x-auto scrollbar-hide mb-6 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                        <div className="shrink-0 w-[140px] sm:w-[160px] h-24 rounded-2xl p-3 bg-gradient-to-br from-[#f2a68d] to-[#f8c9b9] text-white flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform shadow-md shadow-[#f2a68d]/50">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <Sparkles className="h-4 w-4" />
                            </div>
                            <span className="font-bold text-sm leading-tight mt-2">Haftanın En İyileri</span>
                        </div>
                        <div className="shrink-0 w-[140px] sm:w-[160px] h-24 rounded-2xl p-3 bg-gradient-to-br from-[#b388c6] to-[#d4bbee] text-white flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform shadow-md shadow-[#b388c6]/50">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                            <span className="font-bold text-sm leading-tight mt-2">Otizm Gündemi</span>
                        </div>
                        <div className="shrink-0 w-[140px] sm:w-[160px] h-24 rounded-2xl p-3 bg-gradient-to-br from-[#7b9e89] to-[#a2c1b1] text-white flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform shadow-md shadow-[#7b9e89]/50">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <Presentation className="h-4 w-4" />
                            </div>
                            <span className="font-bold text-sm leading-tight mt-2">Uzmanlara Sorduk</span>
                        </div>
                    </div>

                    {/* Page Header & Search (Soothing Style) */}
                    <div className="flex flex-col gap-6 mb-8">
                        <div className="relative w-full">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                            <Input
                                placeholder="Huzur, destek ve bilgi arayın..."
                                className="pl-14 bg-white border-stone-100 rounded-full h-14 text-base shadow-sm focus-visible:ring-[#7b9e89]/20 focus-visible:border-[#7b9e89]/30 transition-all placeholder:text-stone-400"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className={cn(
                                    "px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap",
                                    selectedCategory === null
                                        ? "bg-[#5c8a70] text-white shadow-md shadow-[#5c8a70]/20"
                                        : "bg-white text-stone-500 hover:text-[#5c8a70] border border-stone-100"
                                )}
                            >
                                Sizin İçin
                            </button>
                            {["Otizm Bakımı", "Nöroçeşitlilik", "Günlük Başarılar", "Terapi Sohbeti"].map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={cn(
                                        "px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap border",
                                        selectedCategory === cat
                                            ? "bg-[#5c8a70] text-white border-[#5c8a70] shadow-md shadow-[#5c8a70]/20"
                                            : "bg-white text-stone-500 hover:text-[#5c8a70] border-stone-100"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Featured Article (Soothing Style) */}
                    <div className="group relative rounded-[2.5rem] overflow-hidden bg-white border border-stone-100 shadow-sm hover:shadow-md transition-all mb-8 aspect-[16/9] md:aspect-[21/9] lg:aspect-[21/7]">
                        <div
                            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1544365558-35aa4afcf11f?auto=format&fit=crop&q=80&w=1600')" }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 p-8 w-full">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold text-white uppercase tracking-wider border border-white/20">EDİTÖRÜN SEÇİMİ</span>
                                <span className="text-white/80 text-[10px] font-bold uppercase tracking-wider">12 dk okuma</span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">Sakinliğin Mimarisi: Evde Duyusal Alanlar</h2>
                            <p className="text-white/80 text-sm max-w-xl line-clamp-2">Çocuğunuzun sinir sistemini besleyen bir sığınak oluşturun. Dr. Sarah Chen, daha derin bir güvenlik duygusu uyandıran ışık, ses ve doku ayarlamalarını paylaşıyor.</p>
                        </div>
                    </div>

                    {/* Create Post or Info Banner */}
                    {!loadingProfile && isExpert ? (
                        <CreatePost onPostCreated={handlePostCreated} />
                    ) : !loadingProfile ? (
                        <div className="mb-6 p-4 rounded-2xl border border-[#a2c1b1] bg-[#eaf2ed]/50 flex items-start gap-3 animate-fade-up">
                            <div className="bg-white p-2 rounded-xl shadow-sm shrink-0">
                                <Info className="h-4 w-4 text-[#7b9e89]" />
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

                </div>

                {/* Right Sidebar (Soothing Style) */}
                <aside className="w-full lg:w-[320px] xl:w-[380px] shrink-0 space-y-8 lg:sticky lg:top-6 h-fit">
                    {/* Seeking Guidance CTA */}
                    <div className="bg-[#f2a68d] rounded-[2.5rem] p-8 text-center text-white shadow-lg shadow-[#f2a68d]/20 relative overflow-hidden group">
                        <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all" />
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
                                <Megaphone className="w-7 h-7" />
                            </div>
                            <h4 className="text-2xl font-bold mb-3">Rehberlik mi Arıyorsunuz?</h4>
                            <p className="text-white/90 text-sm leading-relaxed mb-8">Sertifikalı çocuk gelişim uzmanlarımızla nazik bir 1-on-1 görüşme planlayın.</p>
                            <Link href="/experts" className="w-full py-4 bg-white text-[#f2a68d] font-bold rounded-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-md">
                                <Clock className="w-4 h-4" /> Destek Randevusu Al
                            </Link>
                        </div>
                    </div>

                    {/* Trending Themes */}
                    <div className="bg-white rounded-[2rem] p-8 border border-stone-100 shadow-sm">
                        <h4 className="text-stone-800 font-bold text-lg mb-6 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-[#5c8a70]" /> Gündem Temaları
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {["#BEP-Desteği", "#DuyusalOkullar", "#NazikEbeveynlik", "#SözelOlmayanİletişim", "#KonuşmaYolculuğu"].map((theme) => (
                                <button key={theme} className="px-4 py-2 bg-[#f1f7f4] text-[#5c8a70] text-xs font-bold rounded-full border border-[#dbe5e0] hover:bg-[#5c8a70] hover:text-white transition-all">
                                    {theme}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Top Experts */}
                    <div className="bg-white rounded-[2rem] p-8 border border-stone-100 shadow-sm">
                        <h4 className="text-stone-800 font-bold text-lg mb-6 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-[#b388c6]" /> Öne Çıkan Uzmanlar
                        </h4>
                        <div className="space-y-6">
                            {[
                                { name: "Dr. Leyla Çelik", role: "Çocuk Psikoloğu", seed: "Liam" },
                                { name: "Elif Yılmaz", role: "Ergoterapist", seed: "Elena" },
                                { name: "Murat Tekin", role: "Dil Terapisti", seed: "Marcus" }
                            ].map((expert) => (
                                <Link href={`/profile/${expert.name}`} key={expert.name} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full border-2 border-[#f1f7f4] overflow-hidden group-hover:border-[#5c8a70]/30 transition-all">
                                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${expert.seed}`} alt={expert.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-stone-800 leading-none mb-1 group-hover:text-[#5c8a70] transition-colors">{expert.name}</p>
                                            <p className="text-[10px] text-stone-400 uppercase font-bold tracking-widest">{expert.role}</p>
                                        </div>
                                    </div>
                                    <div className="p-2 text-[#5c8a70] bg-[#f1f7f4] rounded-xl group-hover:bg-[#5c8a70] group-hover:text-white transition-all">
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Community Stats */}
                    <div className="bg-[#f1f7f4] rounded-[2rem] p-8 border border-[#dbe5e0] text-center relative overflow-hidden">
                        <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-[#5c8a70]/5 rounded-full blur-xl" />
                        <div className="relative z-10">
                            <div className="inline-flex p-4 bg-white rounded-2xl mb-4 shadow-sm">
                                <Presentation className="w-6 h-6 text-[#5c8a70]" />
                            </div>
                            <p className="text-[#5c8a70] text-2xl font-black tracking-tight">12,480 Üye</p>
                            <p className="text-stone-500 text-sm mt-1 font-medium italic">Birlikte büyüyoruz</p>
                        </div>
                    </div>
                </aside>
            </div>
        </AppShell>
    );
}
