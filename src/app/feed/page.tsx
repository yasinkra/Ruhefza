"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
import { CreatePost } from "@/components/feed/CreatePost";
import { PostList } from "@/components/feed/PostList";
import { Input } from "@/components/ui/input";
import { Info, Search, Megaphone, Sparkles, TrendingUp, ChevronRight, CheckCircle, BookOpen, Clock } from "lucide-react";
import { cn } from "@/utils/cn";
import { createClient } from "@/utils/supabase/client";

export default function FeedPage() {
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortOption] = useState("recent");
    const [isExpert, setIsExpert] = useState<boolean>(false);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [announcement, setAnnouncement] = useState<{ message: string, active: boolean } | null>(null);
    const [userName, setUserName] = useState("");
    const [recommendedExperts, setRecommendedExperts] = useState<{ id: string, full_name: string, role: string | null, avatar_url: string | null, seed?: string }[]>([]);
    const [activeFeedTab, setActiveFeedTab] = useState<'discover' | 'following'>('discover');

    const categories = ["Sizin İçin", "Otizm Bakımı", "Nöroçeşitlilik", "Günlük Başarılar", "Terapi Sohbeti"];

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await createClient().auth.getUser();
            if (user) {
                const { data } = await createClient()
                    .from("profiles")
                    .select("full_name, role, is_verified_expert, verification_status")
                    .eq("id", user.id)
                    .single();

                if (data) {
                    setUserName(data.full_name?.split(' ')[0] || 'Kullanıcı');
                    const isVerifiedTeacher = data.role === 'teacher' && (data.is_verified_expert || data.verification_status === 'approved');
                    const isStudent = data.role === 'student';
                    if (isVerifiedTeacher || isStudent) setIsExpert(true);
                }
            }
            // Fetch Recommended Experts
            let expertsQuery = createClient()
                .from("profiles")
                .select("id, full_name, role, avatar_url")
                .eq("is_verified_expert", true)
                .limit(4);

            if (user?.id) {
                expertsQuery = expertsQuery.neq("id", user.id);
            }

            const { data: expertsData } = await expertsQuery;

            if (expertsData) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setRecommendedExperts(expertsData as any);
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

        init();
        fetchAnnouncement();
    }, []);

    const handlePostCreated = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <AppShell fullWidth>
            <div className="w-full max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-6 xl:gap-8 px-4 md:px-6 py-0 md:py-8 pb-24 md:pb-8 min-h-screen">
                {/* Main Feed Column */}
                <div className="flex-1 min-w-0 relative flex flex-col gap-4 md:gap-6 pb-20 md:pb-6">
                    {/* Welcome Sticky Header */}
                    {/* Desktop Header */}
                    <header className="hidden xl:flex flex-col gap-4 bg-white p-5 rounded-[28px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100/80 sticky top-0 z-20 backdrop-blur-md bg-white/90">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Hoş geldin, {userName} 👋</h2>
                            </div>
                            <Link href="/notifications" className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-all relative">
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                            </Link>
                        </div>
                        <div className="relative w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Ara..."
                                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0c9789]/20 focus:border-[#0c9789]/30 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </header>
                    {/* Feed Tabs - Keşfet / Bağlantıların */}
                    {/* Mobile: classic bottom-border tabs */}
                    <nav className="flex items-center border-b border-gray-100 sticky top-0 xl:hidden z-30 bg-white -mx-4 md:-mx-6 px-2 md:px-4 shadow-sm">
                        <button
                            onClick={() => setActiveFeedTab('discover')}
                            className={cn(
                                "flex-1 py-4 text-sm font-bold transition-all relative",
                                activeFeedTab === 'discover' ? "text-[#0c9789]" : "text-gray-400 hover:text-gray-600"
                            )}
                        >
                            Keşfet
                            {activeFeedTab === 'discover' && (
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-[#0c9789] rounded-t-full shadow-[0_-1px_4px_rgba(12,151,137,0.3)]" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveFeedTab('following')}
                            className={cn(
                                "flex-1 py-4 text-sm font-bold transition-all relative",
                                activeFeedTab === 'following' ? "text-[#0c9789]" : "text-gray-400 hover:text-gray-600"
                            )}
                        >
                            Bağlantıların
                            {activeFeedTab === 'following' && (
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-[#0c9789] rounded-t-full shadow-[0_-1px_4px_rgba(12,151,137,0.3)]" />
                            )}
                        </button>
                    </nav>
                    {/* Desktop: pill-style tabs */}
                    <div className="hidden xl:flex items-center gap-2 p-1.5 bg-gray-100/60 rounded-2xl w-fit">
                        <button
                            onClick={() => setActiveFeedTab('discover')}
                            className={cn(
                                "px-6 py-2.5 rounded-xl text-sm font-semibold transition-all",
                                activeFeedTab === 'discover'
                                    ? "bg-white text-[#0c9789] shadow-sm"
                                    : "text-gray-400 hover:text-gray-600"
                            )}
                        >
                            Keşfet
                        </button>
                        <button
                            onClick={() => setActiveFeedTab('following')}
                            className={cn(
                                "px-6 py-2.5 rounded-xl text-sm font-semibold transition-all",
                                activeFeedTab === 'following'
                                    ? "bg-white text-[#0c9789] shadow-sm"
                                    : "text-gray-400 hover:text-gray-600"
                            )}
                        >
                            Bağlantıların
                        </button>
                    </div>

                    {/* Create Post or Info Banner */}
                    {!loadingProfile && isExpert ? (
                        <CreatePost onPostCreated={handlePostCreated} />
                    ) : !loadingProfile ? (
                        <div className="p-4 rounded-xl border border-[#0c9789]/20 bg-[#f0fdfa]/80 flex items-start gap-3">
                            <div className="bg-white p-2 rounded-lg shadow-sm shrink-0 border border-[#0c9789]/10">
                                <Info className="h-4 w-4 text-[#0c9789]" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-800 mb-0.5">Bilgi Kirliliğini Önlemek İçin</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Bu platformda yalnızca onaylı uzmanlar paylaşım yapabilir. Ebeveynler uzmanların deneyimlerinden güvenle faydalanabilir.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[100px] rounded-2xl border border-gray-100 bg-gray-50 animate-pulse" />
                    )}

                    {/* Category Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {categories.map((cat, i) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(i === 0 ? null : cat)}
                                className={cn(
                                    "whitespace-nowrap px-4 md:px-5 py-2 rounded-full text-xs md:text-sm font-medium flex-shrink-0 transition-colors shadow-sm",
                                    (i === 0 && selectedCategory === null) || selectedCategory === cat
                                        ? "bg-[#0c9789] text-white"
                                        : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <PostList
                        refreshTrigger={refreshTrigger}
                        categoryFilter={selectedCategory}
                        searchQuery={searchQuery}
                        sortOption={sortOption}
                        activeTab={activeFeedTab}
                    />
                </div>

                {/* Right Sidebar — Widgets */}
                <aside className="hidden xl:flex w-[330px] flex-shrink-0 flex-col gap-6 sticky top-6 h-[calc(100vh-4rem)] overflow-y-auto pl-8 py-6 pr-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    
                    {/* Search Widget */}
                    <div className="relative w-full mb-2">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                            placeholder="Kullanıcı veya post ara..."
                            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0c9789]/20 focus:border-[#0c9789]/30 transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    
                    {/* Announcement Widget */}
                    <div className="rounded-[24px] bg-[#11988a] p-6 shadow-[0_8px_30px_rgb(12,151,137,0.15)] group/announcement hover:scale-[1.02] transition-all duration-300">
                        <div className="flex items-center gap-3 mb-4">
                            <Megaphone className="text-white w-5 h-5 group-hover/announcement:rotate-12 transition-transform" strokeWidth={2.5} />
                            <h3 className="font-bold text-sm tracking-widest uppercase text-white/90">Duyuru</h3>
                        </div>
                        <p className="text-[15px] leading-relaxed mb-6 text-white font-medium">
                            {announcement?.active && announcement.message ? announcement.message : 'Bu hafta sonu "Alternatif İletişim Yöntemleri" konulu ücretsiz online seminerimize davetlisiniz.'}
                        </p>
                        <button className="w-full bg-white text-[#11988a] hover:bg-gray-50 py-3 rounded-2xl text-[15px] font-bold transition-all shadow-sm">
                            Kayıt Ol
                        </button>
                    </div>

                    {/* Guidance / Support Widget */}
                    <div className="rounded-[28px] bg-[#f3a88f] p-6 shadow-[0_8px_30px_rgb(243,168,143,0.15)] flex flex-col items-center text-center group/support hover:scale-[1.02] transition-all duration-300">
                        <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover/support:bg-white/30 transition-colors">
                            <Clock className="text-white w-6 h-6" strokeWidth={2} />
                        </div>
                        <h3 className="font-bold text-xl text-white tracking-tight mb-2">
                            Rehberlik mi Arıyorsunuz?
                        </h3>
                        <p className="text-white text-[13px] leading-relaxed mb-6 px-2 opacity-95">
                            Sertifikalı çocuk gelişim uzmanlarımızla nazik bir 1-on-1 görüşme planlayın.
                        </p>
                        <button className="w-full bg-white text-[#f3a88f] hover:bg-gray-50 py-3.5 rounded-[20px] text-[14px] font-bold transition-all shadow-sm flex items-center justify-center gap-2">
                            Destek Randevusu Al
                        </button>
                    </div>

                    {/* Trending Themes */}
                    <div className="bg-white rounded-[28px] p-6 border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
                        <div className="flex items-center gap-2.5 mb-5">
                            <Sparkles className="w-5 h-5 text-[#518875]" strokeWidth={2.5} />
                            <h3 className="font-bold text-[17px] text-gray-900 tracking-tight">Gündem Temaları</h3>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                            {[
                                "#BEP-Desteği", "#DuyusalOkullar", "#NazikEbeveynlik", "#SözelOlmayanİletişim", "#KonuşmaYolculuğu"
                            ].map((tag) => (
                                <div key={tag} className="px-4 py-2 bg-[#f1faf5] border border-[#d2efe2] text-[#3e7e61] text-[13px] font-semibold rounded-2xl cursor-pointer hover:bg-[#0c9789] hover:text-white hover:border-[#0c9789] transition-all duration-200">
                                    {tag}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Suggested Experts */}
                    {recommendedExperts.length > 0 && (
                        <div className="bg-white rounded-[28px] p-6 border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
                            <div className="flex items-center gap-2.5 mb-6">
                                <TrendingUp className="w-5 h-5 text-[#8e8cd8]" strokeWidth={2.5} />
                                <h3 className="font-bold text-[17px] text-gray-900 tracking-tight">Öne Çıkan Uzmanlar</h3>
                            </div>
                            <div className="flex flex-col gap-5">
                                {recommendedExperts.map((expert) => (
                                    <div key={expert.id} className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <Link href={`/profile/${expert.id}`} className="w-[46px] h-[46px] rounded-full bg-[#f0f9f4] flex items-center justify-center shrink-0 overflow-hidden ring-4 ring-white shadow-sm border border-gray-100">
                                                {expert.avatar_url ? (
                                                    <img src={expert.avatar_url} alt={expert.full_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${expert.id}&backgroundColor=f1faf5`} alt={expert.full_name} className="w-full h-full object-cover" />
                                                )}
                                            </Link>
                                            <div className="min-w-0 flex-1">
                                                <Link href={`/profile/${expert.id}`} className="text-[15px] font-bold text-gray-900 truncate flex items-center gap-1 hover:text-[#0c9789] transition-colors">
                                                    {expert.full_name}
                                                </Link>
                                                <p className="text-[10px] tracking-widest font-bold uppercase text-gray-400 truncate mt-0.5">{expert.role === 'teacher' ? 'Uzman Eğitimci' : (expert.role === 'institution' ? 'Kurum' : 'Özel Eğitim Uzmanı')}</p>
                                            </div>
                                        </div>
                                        <Link href={`/profile/${expert.id}`} className="flex-shrink-0 w-8 h-8 rounded-full bg-[#f4fcf9] border border-[#e5f5f0] flex items-center justify-center text-[#9ca3af] hover:bg-[#11988a] hover:text-white hover:border-[#11988a] transition-all shadow-sm">
                                            <ChevronRight className="w-4 h-4 ml-0.5" strokeWidth={2.5} />
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Footer Links */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 px-2 text-[10px] text-gray-400">
                        <span className="hover:underline cursor-pointer">Hakkımızda</span>
                        <span className="hover:underline cursor-pointer">Yardım</span>
                        <span className="hover:underline cursor-pointer">Gizlilik</span>
                        <span>© 2026 Ruhefza</span>
                    </div>
                </aside>
            </div>
        </AppShell>
    );
}
