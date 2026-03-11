"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { ArticleCard, Article } from "@/components/knowledge/ArticleCard";
import { Input } from "@/components/ui/input";
import { Search, Megaphone, BookOpen, Clock, User, Puzzle, Brain, Activity, MessageCircle, Scale, ChevronRight, Bookmark, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/AppShell";
import { useRouter } from "next/navigation";
import { cn } from "@/utils/cn";
import Head from "next/head";

export default function KnowledgeBasePage() {
    const router = useRouter();
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [canCreate, setCanCreate] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loadingUser, setLoadingUser] = useState(true);
    const [announcement, setAnnouncement] = useState<{ message: string, active: boolean } | null>(null);
    const [bookmarkedArticleIds, setBookmarkedArticleIds] = useState<Set<string>>(new Set());
    const [likedArticleIds, setLikedArticleIds] = useState<Set<string>>(new Set());
    const [isOtherOpen, setIsOtherOpen] = useState(false);

    const otherCategories = [
        "Özgül Öğrenme Güçlüğü",
        "Zihinsel Yetersizlik",
        "İşitme Yetersizliği",
        "Görme Yetersizliği",
        "Üstün Zekalılar ve Yetenekliler",
        "Erken Çocuklukta Özel Eğitim",
        "Davranış Bozuklukları",
        "Kaynaştırma ve Bütünleştirme",
        "Aile Eğitimi ve Danışmanlığı",
        "BEP Hazırlama Süreçleri",
        "Duyu Bütünleme",
        "Genel"
    ];

    // Rich categories with soothing pastel colors
    const categories = [
        { id: "Otizm", name: "Otizm", icon: <Puzzle className="h-6 w-6" />, color: "from-[#71a5d6] to-[#a0c5e8]", lightBg: "bg-[#e3eff8]", text: "text-[#71a5d6]" },
        { id: "DEHB", name: "DEHB", icon: <Brain className="h-6 w-6" />, color: "from-[#0c9789] to-[#14b8a6]", lightBg: "bg-[#f0fdfa]", text: "text-[#0c9789]" },
        { id: "Fiziksel Gelişim", name: "Fiziksel Gelişim", icon: <Activity className="h-6 w-6" />, color: "from-[#0c9789] to-[#14b8a6]", lightBg: "bg-[#f0fdfa]", text: "text-[#0c9789]" },
        { id: "Dil ve Konuşma", name: "Dil ve Konuşma", icon: <MessageCircle className="h-6 w-6" />, color: "from-[#0c9789] to-[#14b8a6]", lightBg: "bg-[#f0fdfa]", text: "text-[#0c9789]" },
        { id: "Yasal Haklar", name: "Yasal Haklar", icon: <Scale className="h-6 w-6" />, color: "from-[#e27d73] to-[#efaaa5]", lightBg: "bg-[#faeaea]", text: "text-[#e27d73]" },
    ];

    const fetchArticles = async () => {
        setLoading(true);
        let query = createClient()
            .from("articles")
            .select(`
                id,
                title,
                summary,
                category,
                created_at,
                author_id,
                author:author_id(
                    full_name,
                    avatar_url
                )
            `)
            .order("created_at", { ascending: false });

        if (selectedCategory) {
            query = query.eq("category", selectedCategory);
        }

        if (searchTerm) {
            query = query.ilike("title", `%${searchTerm}%`);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching articles:", error);
        } else {
            setArticles(data as unknown as Article[] || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        const checkUserStatus = async () => {
            const { data: { user } } = await createClient().auth.getUser();
            if (user) {
                setCurrentUserId(user.id);
                const { data } = await createClient().from('profiles').select('role, is_verified_expert, verification_status, is_admin').eq('id', user.id).single();
                if (data) {
                    const isVerifiedTeacher = data.role === 'teacher' && (data.is_verified_expert || data.verification_status === 'approved');
                    const isStudent = data.role === 'student';
                    if (isVerifiedTeacher || isStudent) setCanCreate(true);
                    if (data.is_admin) setIsAdmin(true);
                }
                // Fetch bookmarked article IDs
                const { data: bData } = await createClient()
                    .from("bookmarks")
                    .select("item_id")
                    .eq("user_id", user.id)
                    .eq("item_type", "article");
                if (bData) setBookmarkedArticleIds(new Set(bData.map((b: { item_id: string }) => b.item_id)));

                // Fetch liked article IDs
                const { data: lData } = await createClient()
                    .from("article_likes")
                    .select("article_id")
                    .eq("user_id", user.id);
                if (lData) setLikedArticleIds(new Set(lData.map((l: { article_id: string }) => l.article_id)));
            }
            setLoadingUser(false);
        };

        const fetchAnnouncement = async () => {
            const { data } = await createClient()
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

        const timeoutId = setTimeout(() => {
            fetchArticles();
            checkUserStatus();
            fetchAnnouncement();
        }, 300); // Debounce

        return () => clearTimeout(timeoutId);
    }, [searchTerm, selectedCategory]);

    const handleArticleDeleted = (id: string) => {
        setArticles(prev => prev.filter(a => a.id !== id));
    };

    return (
        <AppShell fullWidth={true}>
            <div className="h-full overflow-y-auto bg-[#fdfcfaf5] pb-24">
                {/* Announcement Section */}
                {announcement?.active && (
                    <div className="bg-gradient-to-r from-[#0c9789] to-[#14b8a6] p-3 text-white">
                        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-3">
                            <Megaphone className="h-4 w-4 shrink-0" />
                            <p className="text-sm font-medium">{announcement.message}</p>
                        </div>
                    </div>
                )}

                {/* Header Navbar-like section per design */}
                <div className="pt-8 pb-6 px-4 sm:px-6 lg:px-8 max-w-[1340px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[28px] font-bold text-gray-900 tracking-tight leading-none">Eğitim Kütüphanesi</h1>
                        <p className="text-[15px] text-gray-500 font-medium mt-2">Ebeveynlik yolculuğunuz için özenle seçilmiş kaynaklar</p>
                    </div>
                    {/* Placeholder for top right widgets like Notifications / Profile in design */}
                    <div className="hidden md:flex items-center gap-3">
                        {!loadingUser && canCreate && (
                            <Button
                                onClick={() => router.push('/knowledge/create')}
                                className="bg-[#4ade80] hover:bg-[#22c55e] text-white shadow-sm rounded-full h-10 px-6 font-bold transition-all border-none"
                            >
                                + Paylaşımda Bulun
                            </Button>
                        )}
                    </div>
                </div>

                {/* Hero Banner Area */}
                <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8 mb-8">
                    <div className="relative w-full rounded-[36px] overflow-hidden bg-[#d3bca8] min-h-[340px] shadow-sm flex flex-col items-center justify-center p-8 text-center text-gray-900 border border-transparent">
                        {/* Background Image Graphic */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                            src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
                            alt="Leaves background" 
                            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-[0.35]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />

                        <div className="relative z-10 max-w-4xl px-4 w-full">
                            <h2 className="text-4xl md:text-5xl font-black mb-5 tracking-tight text-[#1a1a1a]">Bilgiyle Huzur Bulun</h2>
                            <p className="text-[15px] md:text-[17px] font-medium text-gray-800/80 mb-10 max-w-xl mx-auto leading-relaxed">
                                Aileniz için tasarlanmış, uzman onaylı kaynaklar ve şefkatli rehberler.
                            </p>

                            <div className="flex bg-white/95 backdrop-blur-md rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-1.5 max-w-2xl mx-auto focus-within:ring-2 focus-within:ring-[#4ade80]/50 transition-all border border-white">
                                <div className="flex-1 flex items-center pl-5 pr-2">
                                    <Search className="h-5 w-5 text-[#4ade80]" />
                                    <Input
                                        type="text"
                                        placeholder="Makaleler, terapiler ve rehberler arasında arama yapın..."
                                        className="h-12 border-0 bg-transparent text-[15px] focus-visible:ring-0 shadow-none text-gray-700 placeholder:text-gray-400 font-medium w-full"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <Button className="rounded-full bg-[#4ade80] hover:bg-[#22c55e] text-white px-8 h-12 font-bold shadow-md shadow-[#4ade80]/20 transition-all text-[15px]">
                                    Ara
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pills Categories */}
                <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8 mb-10">
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={cn(
                                "px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm whitespace-nowrap",
                                selectedCategory === null
                                    ? "bg-[#4ade80] text-white border-2 border-[#4ade80]"
                                    : "bg-white text-gray-600 border border-gray-100 hover:bg-gray-50 hover:border-gray-200"
                            )}
                        >
                            Tüm Konular
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={cn(
                                    "px-6 py-2.5 rounded-full text-[13px] font-bold transition-all shadow-sm whitespace-nowrap",
                                    selectedCategory === cat.id
                                        ? "bg-orange-50/50 text-orange-400 border-2 border-orange-200 shadow-md"
                                        : "bg-white text-gray-600 border border-gray-100 hover:bg-gray-50 hover:border-gray-200"
                                )}
                            >
                                {cat.name}
                            </button>
                        ))}

                        {/* Dropdown for Other Categories */}
                        <div className="relative">
                            <button
                                onClick={() => setIsOtherOpen(!isOtherOpen)}
                                onBlur={() => setTimeout(() => setIsOtherOpen(false), 200)}
                                className={cn(
                                    "flex items-center gap-1.5 px-6 py-2.5 rounded-full text-[13px] font-bold transition-all shadow-sm whitespace-nowrap",
                                    otherCategories.includes(selectedCategory || "")
                                        ? "bg-purple-50/50 text-purple-600 border-2 border-purple-200 shadow-md"
                                        : "bg-white text-gray-600 border border-gray-100 hover:bg-gray-50 hover:border-gray-200"
                                )}
                            >
                                {otherCategories.includes(selectedCategory || "") ? selectedCategory : "Diğer"}
                                <ChevronDown className={cn("h-4 w-4 transition-transform", isOtherOpen && "rotate-180")} />
                            </button>
                            {isOtherOpen && (
                                <div className="absolute top-full left-0 mt-2 w-64 max-h-[300px] overflow-y-auto bg-white rounded-2xl shadow-xl border border-gray-100 z-50 py-2">
                                    {otherCategories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => {
                                                setSelectedCategory(cat);
                                                setIsOtherOpen(false);
                                            }}
                                            className={cn(
                                                "w-full text-left px-4 py-2.5 text-[13px] font-medium transition-colors",
                                                selectedCategory === cat
                                                    ? "bg-purple-50 text-purple-700 font-bold"
                                                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                            )}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8 py-2">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 xl:gap-10">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="flex flex-col bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-pulse h-[400px] overflow-hidden">
                                    <div className="h-44 bg-gray-100 w-full shrink-0"></div>
                                    <div className="px-6 pt-5">
                                        <div className="h-4 w-24 bg-gray-100 rounded-full mb-5"></div>
                                        <div className="h-8 w-5/6 bg-gray-100 rounded-xl mb-4"></div>
                                        <div className="space-y-3 mt-4">
                                            <div className="h-3.5 w-full bg-gray-50 rounded-lg"></div>
                                            <div className="h-3.5 w-4/6 bg-gray-50 rounded-lg"></div>
                                        </div>
                                    </div>
                                    <div className="mt-auto p-6 pt-6 bg-white flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 bg-gray-100 rounded-full"></div>
                                            <div className="space-y-2">
                                                <div className="h-2.5 w-20 bg-gray-100 rounded-full"></div>
                                                <div className="h-2 w-12 bg-gray-100 rounded-full"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : articles.length === 0 ? (
                        <div className="text-center py-24 bg-white rounded-[40px] border border-dashed border-gray-200 max-w-3xl mx-auto px-8 shadow-sm">
                            <div className="inline-flex h-24 w-24 items-center justify-center rounded-[32px] bg-gray-50 mb-8 border border-gray-100 group transition-all duration-500 hover:scale-110">
                                <Search className="h-10 w-10 text-gray-300" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-800 mb-3 tracking-tight">Makale bulunamadı</h3>
                            <p className="text-gray-500 font-medium max-w-md mx-auto leading-relaxed">Aramanıza uygun herhangi bir rehber veya kaynak bulamadık.</p>
                            {searchTerm && (
                                <Button
                                    variant="outline"
                                    onClick={() => setSearchTerm("")}
                                    className="mt-8 rounded-full border-gray-200 text-gray-900 font-bold px-8 hover:bg-gray-50"
                                >
                                    Aramayı Temizle
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {/* Regular Article Grid */}
                            <div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
                                    {articles.map((article) => (
                                        <div key={article.id} className="h-full">
                                            <ArticleCard
                                                article={article}
                                                currentUserId={currentUserId}
                                                isAdmin={isAdmin}
                                                onDelete={handleArticleDeleted}
                                                isBookmarked={bookmarkedArticleIds.has(article.id)}
                                                isLiked={likedArticleIds.has(article.id)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Load More Button matching the design */}
                            {articles.length >= 6 && (
                                <div className="flex w-full justify-center pt-8 pb-4">
                                    <Button 
                                        variant="outline" 
                                        className="rounded-full border-[#4ade80] text-[#4ade80] hover:bg-[#4ade80]/5 font-bold px-10 h-12 text-[15px] shadow-sm tracking-wide"
                                    >
                                        Daha Fazla Makale Yükle
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
