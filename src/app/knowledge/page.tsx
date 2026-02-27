"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { ArticleCard, Article } from "@/components/knowledge/ArticleCard";
import { Input } from "@/components/ui/input";
import { Search, Megaphone, BookOpen, Clock, User } from "lucide-react";
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

    // Dummy categories for now
    const categories = ["Otizm", "DEHB", "Fiziksel Gelişim", "Dil ve Konuşma", "Yasal Haklar"];

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
                    <div className="bg-gradient-to-r from-sky-600 to-indigo-600 p-3 text-white">
                        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-3">
                            <Megaphone className="h-4 w-4 shrink-0" />
                            <p className="text-sm font-medium">{announcement.message}</p>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="bg-white border-b border-stone-200 pt-12 pb-16 px-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-sky-50 rounded-full blur-3xl opacity-50"></div>
                    <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>

                    <div className="max-w-7xl mx-auto text-center relative">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold uppercase tracking-wider mb-6 ring-1 ring-sky-100">
                            <BookOpen className="h-3.5 w-3.5" />
                            Bilgi Bankası
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 sm:text-5xl mb-6 tracking-tight">Eğitim Kütüphanesi</h1>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
                            Özel eğitim alanında uzmanlar ve aileler tarafından hazırlanan profesyonel rehberler, güncel makaleler ve materyaller.
                        </p>

                        {!loadingUser && canCreate ? (
                            <div className="mb-10">
                                <Button
                                    onClick={() => router.push('/knowledge/create')}
                                    className="bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200 rounded-2xl h-12 px-8 font-bold transition-all hover:-translate-y-0.5"
                                >
                                    + Paylaşımda Bulun
                                </Button>
                            </div>
                        ) : !loadingUser && (
                            <div className="mb-10 inline-flex items-center gap-3 bg-white border border-slate-100 p-4 py-3 rounded-2xl shadow-sm max-w-xl mx-auto">
                                <span className="flex h-2 w-2 rounded-full bg-amber-400"></span>
                                <p className="text-sm font-semibold text-slate-600">
                                    Sadece doğrulanmış uzmanlar yeni bilgi paylaşabilir.
                                </p>
                            </div>
                        )}

                        <div className="max-w-2xl mx-auto relative group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                            <Input
                                type="text"
                                placeholder="Makale, konu veya yazar ara..."
                                className="pl-14 h-14 text-base bg-slate-50 border-slate-200 focus:bg-white focus:ring-0 focus:border-sky-200 transition-all shadow-sm rounded-2xl"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-wrap justify-center gap-2.5 mt-8">
                            <Button
                                variant={selectedCategory === null ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedCategory(null)}
                                className={cn(
                                    "rounded-xl px-5 h-9 font-bold transition-all",
                                    selectedCategory === null ? "bg-slate-900 border-slate-900 shadow-md" : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                                )}
                            >
                                Hepsi
                            </Button>
                            {categories.map((cat) => (
                                <Button
                                    key={cat}
                                    variant={selectedCategory === cat ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSelectedCategory(cat)}
                                    className={cn(
                                        "rounded-xl px-5 h-9 font-bold transition-all",
                                        selectedCategory === cat ? "bg-sky-500 border-sky-500 shadow-md" : "bg-white text-slate-600 hover:bg-sky-50 border-slate-200"
                                    )}
                                >
                                    {cat}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="flex flex-col bg-white rounded-[28px] border border-slate-100 shadow-sm animate-pulse h-[340px] overflow-hidden">
                                    <div className="h-2 bg-slate-100 w-full mb-6"></div>
                                    <div className="px-7 pt-2">
                                        <div className="h-4 w-24 bg-slate-100 rounded-full mb-5"></div>
                                        <div className="h-8 w-5/6 bg-slate-100 rounded-xl mb-4"></div>
                                        <div className="space-y-3 mt-6">
                                            <div className="h-3.5 w-full bg-slate-50 rounded-lg"></div>
                                            <div className="h-3.5 w-full bg-slate-50 rounded-lg"></div>
                                            <div className="h-3.5 w-4/6 bg-slate-50 rounded-lg"></div>
                                        </div>
                                    </div>
                                    <div className="mt-auto p-7 pt-6 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-slate-100 rounded-2xl"></div>
                                            <div className="space-y-2">
                                                <div className="h-2.5 w-20 bg-slate-100 rounded-full"></div>
                                                <div className="h-2 w-12 bg-slate-100 rounded-full"></div>
                                            </div>
                                        </div>
                                        <div className="h-10 w-10 bg-white border border-slate-100 rounded-full"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : articles.length === 0 ? (
                        <div className="text-center py-24 bg-white rounded-[40px] border border-dashed border-slate-200 max-w-3xl mx-auto px-8 shadow-sm">
                            <div className="inline-flex h-24 w-24 items-center justify-center rounded-[32px] bg-slate-50 mb-8 border border-slate-100 group transition-all duration-500 hover:scale-110">
                                <Search className="h-10 w-10 text-slate-300" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Kayıt Bulunamadı</h3>
                            <p className="text-slate-500 font-medium max-w-md mx-auto leading-relaxed">Aradığınız kriterlere uygun herhangi bir makale veya rehber şu an için mevcut değil.</p>
                            {searchTerm && (
                                <Button
                                    variant="outline"
                                    onClick={() => setSearchTerm("")}
                                    className="mt-8 rounded-2xl border-slate-200 text-slate-900 font-bold px-8 hover:bg-slate-50"
                                >
                                    Aramayı Sıfırla
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {articles.map((article) => (
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
                    )}
                </div>
            </div>
        </AppShell>
    );
}
