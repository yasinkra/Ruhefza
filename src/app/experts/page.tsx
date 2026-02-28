"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/utils/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BadgeCheck, Sparkles, TrendingUp, MessageCircle, Heart, Bookmark, ChevronRight, Search, Filter, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import Link from "next/link";

interface Expert {
    id: string;
    full_name: string;
    avatar_url: string;
    role: string;
    specialization: string;
    is_verified_expert: boolean;
    popularity_score: number;
    top_article?: {
        id: string;
        title: string;
    };
}

export default function ExpertsPage() {
    const [experts, setExperts] = useState<Expert[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchExperts = async () => {
            setLoading(true);
            const supabase = createClient();

            // Fetch experts with their aggregate stats for popularity ranking
            // Ranking formula: (Article Likes * 2) + Article Bookmarks
            // Fetch experts and their articles separately if join is ambiguous
            const { data: expertsData, error: expertsError } = await supabase
                .from('profiles')
                .select(`
                    id,
                    full_name,
                    avatar_url,
                    role,
                    special_note,
                    is_verified_expert
                `)
                .eq('role', 'teacher')
                .eq('verification_status', 'approved');

            if (expertsError) {
                console.error("Error fetching experts:", expertsError);
            } else if (expertsData) {
                const expertIds = expertsData.map(e => e.id);

                const { data: articlesData, error: articlesError } = await supabase
                    .from('articles')
                    .select('id, title, likes_count, bookmarks_count, author_id')
                    .in('author_id', expertIds);

                const rankedExperts = expertsData.map((expert: any) => {
                    let score = 0;
                    let topArticle = null;
                    const expertArticles = articlesData?.filter(a => a.author_id === expert.id) || [];

                    if (expertArticles.length > 0) {
                        score = expertArticles.reduce((acc: number, art: any) => {
                            return acc + (art.likes_count * 2) + (art.bookmarks_count || 0);
                        }, 0);

                        topArticle = [...expertArticles].sort((a: any, b: any) => b.likes_count - a.likes_count)[0];
                    }

                    return {
                        id: expert.id,
                        full_name: expert.full_name,
                        avatar_url: expert.avatar_url,
                        role: expert.role,
                        specialization: expert.special_note || "Uzman",
                        is_verified_expert: expert.is_verified_expert,
                        popularity_score: score,
                        top_article: topArticle ? { id: topArticle.id, title: topArticle.title } : undefined
                    };
                }).sort((a, b) => b.popularity_score - a.popularity_score);

                setExperts(rankedExperts);
            }
            setLoading(false);
        };

        fetchExperts();
    }, []);

    const filteredExperts = experts.filter(e =>
        e.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.specialization?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AppShell fullWidth>
            <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-24 md:pb-12 min-h-screen">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#f2a68d]/10 text-[#f2a68d] rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-[#f2a68d]/20">
                            <Sparkles className="w-3.5 h-3.5" /> En İyi Uzmanlar
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-stone-900 mb-4 tracking-tight leading-tight">
                            Geleceği <span className="text-[#5c8a70]">Birlikte</span> İnşa Edelim
                        </h1>
                        <p className="text-stone-500 text-lg leading-relaxed">
                            Topluluğumuza en çok değer katan, paylaşımlarıyla ebeveynlere ışık tutan doğrulanmış uzmanlarımızı keşfedin ve onlarla iletişime geçin.
                        </p>
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                        <Input
                            placeholder="Uzman veya branş ara..."
                            className="pl-12 h-14 bg-white border-stone-100 rounded-2xl shadow-sm focus:ring-[#5c8a70]/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 text-[#5c8a70] animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredExperts.map((expert, index) => (
                            <Link
                                href={`/profile/${expert.id}`}
                                key={expert.id}
                                className="group bg-white rounded-[2.5rem] border border-stone-100 p-6 hover:shadow-xl hover:shadow-[#5c8a70]/5 transition-all duration-500 flex flex-col relative overflow-hidden"
                            >
                                {/* Popularity Rank Badge */}
                                <div className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1 bg-[#f1f7f4] text-[#5c8a70] rounded-full text-[10px] font-bold border border-[#dbe5e0]">
                                    <TrendingUp className="w-3 h-3" /> #{index + 1} Sırada
                                </div>

                                {/* Avatar & Basic Info */}
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="relative shrink-0">
                                        <div className="w-20 h-20 rounded-[2rem] overflow-hidden border-2 border-white shadow-md group-hover:scale-105 transition-transform duration-500">
                                            <Avatar className="w-full h-full">
                                                <AvatarImage src={expert.avatar_url} />
                                                <AvatarFallback className="bg-[#b388c6] text-white font-bold text-2xl">
                                                    {expert.full_name?.[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>
                                        {expert.is_verified_expert && (
                                            <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-sm">
                                                <BadgeCheck className="w-5 h-5 text-[#7b9e89] fill-[#7b9e89]/10" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-stone-900 group-hover:text-[#5c8a70] transition-colors">{expert.full_name}</h3>
                                        <p className="text-xs text-stone-400 font-bold uppercase tracking-wider">{expert.role === 'teacher' ? expert.specialization : 'Uzman'}</p>
                                    </div>
                                </div>

                                {/* Top Article Suggestion */}
                                {expert.top_article && (
                                    <div className="mb-8 p-4 bg-[#f8fcf9] rounded-2xl border border-[#5c8a70]/10 flex flex-col gap-2">
                                        <span className="text-[10px] font-black text-[#5c8a70] uppercase tracking-widest opacity-60">En Popüler Makalesi</span>
                                        <p className="text-xs font-bold text-stone-700 line-clamp-1">{expert.top_article.title}</p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="mt-auto flex items-center justify-between pt-4 border-t border-stone-50">
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-1.5 text-stone-400 group-hover:text-[#f2a68d] transition-colors">
                                            <Heart className="w-4 h-4" />
                                            <span className="text-[11px] font-bold">{expert.popularity_score} Etkileşim</span>
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-stone-50 text-stone-400 flex items-center justify-center group-hover:bg-[#5c8a70] group-hover:text-white transition-all duration-300">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredExperts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mb-6">
                            <Search className="w-8 h-8 text-stone-300" />
                        </div>
                        <h3 className="text-xl font-bold text-stone-800 mb-2">Uzman Bulunamadı</h3>
                        <p className="text-stone-500 max-w-xs px-6">Aradığınız kriterlere uygun doğrulanmış uzman bulunamadı. Lütfen farklı bir arama yapın.</p>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
