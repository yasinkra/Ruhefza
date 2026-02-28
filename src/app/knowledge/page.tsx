"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { ArticleCard, Article } from "@/components/knowledge/ArticleCard";
import { Input } from "@/components/ui/input";
import { Search, Megaphone, BookOpen, Clock, User, Puzzle, Brain, Activity, MessageCircle, Scale, ChevronRight, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/AppShell";
import { useRouter } from "next/navigation";
import { cn } from "@/utils/cn";

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

    // Rich categories with icons and colors
    const categories = [
        { id: "Otizm", name: "Otizm", icon: <Puzzle className="h-6 w-6" />, color: "from-blue-500 to-cyan-500", lightBg: "bg-blue-50", text: "text-blue-600" },
        { id: "DEHB", name: "DEHB", icon: <Brain className="h-6 w-6" />, color: "from-purple-500 to-fuchsia-500", lightBg: "bg-purple-50", text: "text-purple-600" },
        { id: "Fiziksel Gelişim", name: "Fiziksel Gelişim", icon: <Activity className="h-6 w-6" />, color: "from-emerald-500 to-teal-500", lightBg: "bg-emerald-50", text: "text-emerald-600" },
        { id: "Dil ve Konuşma", name: "Dil ve Konuşma", icon: <MessageCircle className="h-6 w-6" />, color: "from-amber-400 to-orange-500", lightBg: "bg-orange-50", text: "text-orange-600" },
        { id: "Yasal Haklar", name: "Yasal Haklar", icon: <Scale className="h-6 w-6" />, color: "from-rose-400 to-red-500", lightBg: "bg-red-50", text: "text-red-600" },
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
            <div className="h-full overflow-y-auto bg-stone-50 pb-20">
                {/* Announcement Section */}
                {announcement?.active && (
                    <div className="bg-gradient-to-r from-teal-600 to-indigo-600 p-3 text-white">
                        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-3">
                            <Megaphone className="h-4 w-4 shrink-0" />
                            <p className="text-sm font-medium">{announcement.message}</p>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="bg-white border-b border-stone-200 pt-8 pb-10 md:pt-12 md:pb-16 px-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-teal-50 rounded-full blur-3xl opacity-50"></div>
                    <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>

                    <div className="max-w-7xl mx-auto text-center relative">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-bold uppercase tracking-wider mb-4 md:mb-6 ring-1 ring-teal-100">
                            <BookOpen className="h-3.5 w-3.5" />
                            Bilgi Bankası
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-stone-900 md:text-5xl mb-4 md:mb-6 tracking-tight">Eğitim Kütüphanesi</h1>
                        <p className="text-sm md:text-lg text-stone-600 max-w-2xl mx-auto mb-6 md:mb-10 font-medium leading-relaxed">
                            Özel eğitim alanında uzmanlar ve aileler tarafından hazırlanan profesyonel rehberler, güncel makaleler ve materyaller.
                        </p>

                        {!loadingUser && canCreate ? (
                            <div className="mb-10">
                                <Button
                                    onClick={() => router.push('/knowledge/create')}
                                    className="bg-stone-900 hover:bg-stone-800 text-white shadow-xl shadow-slate-200 rounded-2xl h-12 px-8 font-bold transition-all hover:-translate-y-0.5"
                                >
                                    + Paylaşımda Bulun
                                </Button>
                            </div>
                        ) : !loadingUser && (
                            <div className="mb-10 inline-flex items-center gap-3 bg-white border border-stone-100 p-4 py-3 rounded-2xl shadow-sm max-w-xl mx-auto">
                                <span className="flex h-2 w-2 rounded-full bg-amber-400"></span>
                                <p className="text-sm font-semibold text-stone-600">
                                    Sadece doğrulanmış uzmanlar yeni bilgi paylaşabilir.
                                </p>
                            </div>
                        )}

                        <div className="max-w-2xl mx-auto relative group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#0D9488] transition-colors" />
                            <Input
                                type="text"
                                placeholder="Makale, konu veya yazar ara..."
                                className="pl-16 h-14 text-[15px] bg-white border-white focus:bg-white focus:ring-[#0D9488]/20 focus:border-[#0D9488]/30 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-full"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Rich Category Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mt-12 max-w-5xl mx-auto">
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className={cn(
                                    "flex flex-col items-center justify-center p-5 sm:p-6 rounded-[32px] border transition-all duration-300 group",
                                    selectedCategory === null
                                        ? "bg-stone-900 border-stone-900 text-white shadow-xl shadow-stone-900/20 scale-105"
                                        : "bg-white border-transparent shadow-[0_4px_20px_rgb(0,0,0,0.03)] text-gray-600 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1.5"
                                )}
                            >
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-colors",
                                    selectedCategory === null ? "bg-white/20 text-white" : "bg-stone-100 text-stone-500 group-hover:bg-stone-200"
                                )}>
                                    <BookOpen className="h-6 w-6" />
                                </div>
                                <span className="font-bold text-sm">Tümü</span>
                            </button>

                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-5 sm:p-6 rounded-[32px] border transition-all duration-300 group relative overflow-hidden",
                                        selectedCategory === cat.id
                                            ? `border-transparent text-white shadow-xl scale-105`
                                            : "bg-white border-transparent shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1.5"
                                    )}
                                >
                                    {selectedCategory === cat.id && (
                                        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-90", cat.color)} />
                                    )}

                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-all relative z-10",
                                        selectedCategory === cat.id
                                            ? "bg-white/20 text-white shadow-inner"
                                            : cn(cat.lightBg, cat.text, "group-hover:scale-110 group-hover:rotate-3")
                                    )}>
                                        {cat.icon}
                                    </div>
                                    <span className={cn(
                                        "font-bold text-sm relative z-10 text-center leading-tight",
                                        selectedCategory === cat.id ? "text-white" : "text-stone-700 group-hover:text-stone-900"
                                    )}>
                                        {cat.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="flex flex-col bg-white rounded-[32px] border border-stone-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-pulse h-[340px] overflow-hidden">
                                    <div className="h-2 bg-stone-100 w-full mb-6"></div>
                                    <div className="px-7 pt-2">
                                        <div className="h-4 w-24 bg-stone-100 rounded-full mb-5"></div>
                                        <div className="h-8 w-5/6 bg-stone-100 rounded-xl mb-4"></div>
                                        <div className="space-y-3 mt-6">
                                            <div className="h-3.5 w-full bg-stone-50 rounded-lg"></div>
                                            <div className="h-3.5 w-full bg-stone-50 rounded-lg"></div>
                                            <div className="h-3.5 w-4/6 bg-stone-50 rounded-lg"></div>
                                        </div>
                                    </div>
                                    <div className="mt-auto p-7 pt-6 border-t border-stone-50 flex items-center justify-between bg-stone-50/30">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-stone-100 rounded-2xl"></div>
                                            <div className="space-y-2">
                                                <div className="h-2.5 w-20 bg-stone-100 rounded-full"></div>
                                                <div className="h-2 w-12 bg-stone-100 rounded-full"></div>
                                            </div>
                                        </div>
                                        <div className="h-10 w-10 bg-white border border-stone-100 rounded-full"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : articles.length === 0 ? (
                        <div className="text-center py-24 bg-white rounded-[40px] border border-dashed border-stone-200 max-w-3xl mx-auto px-8 shadow-sm">
                            <div className="inline-flex h-24 w-24 items-center justify-center rounded-[32px] bg-stone-50 mb-8 border border-stone-100 group transition-all duration-500 hover:scale-110">
                                <Search className="h-10 w-10 text-stone-300" />
                            </div>
                            <h3 className="text-2xl font-black text-stone-800 mb-3 tracking-tight">Kayıt Bulunamadı</h3>
                            <p className="text-stone-500 font-medium max-w-md mx-auto leading-relaxed">Aradığınız kriterlere uygun herhangi bir makale veya rehber şu an için mevcut değil.</p>
                            {searchTerm && (
                                <Button
                                    variant="outline"
                                    onClick={() => setSearchTerm("")}
                                    className="mt-8 rounded-2xl border-stone-200 text-stone-900 font-bold px-8 hover:bg-stone-50"
                                >
                                    Aramayı Sıfırla
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {/* Featured Article */}
                            {!searchTerm && !selectedCategory && articles.length > 0 && (
                                <div className="mb-12">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 text-amber-600">
                                            <Bookmark className="h-5 w-5 fill-amber-600" />
                                        </div>
                                        <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">Editörün Seçimi</h2>
                                    </div>
                                    <div className="md:h-[300px]">
                                        {/* Render the first article as featured */}
                                        <ArticleCard
                                            article={articles[0]}
                                            currentUserId={currentUserId}
                                            isAdmin={isAdmin}
                                            onDelete={handleArticleDeleted}
                                            isBookmarked={bookmarkedArticleIds.has(articles[0].id)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Regular Article Grid */}
                            <div>
                                {(!searchTerm && !selectedCategory && articles.length > 0) && (
                                    <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight mb-6 mt-4">Tüm Makaleler</h2>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {(!searchTerm && !selectedCategory ? articles.slice(1) : articles).map((article) => (
                                        <div key={article.id} className="h-full">
                                            <ArticleCard
                                                article={article}
                                                currentUserId={currentUserId}
                                                isAdmin={isAdmin}
                                                onDelete={handleArticleDeleted}
                                                isBookmarked={bookmarkedArticleIds.has(article.id)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
