"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/utils/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { BadgeCheck, Search, Loader2, TrendingUp, MessageCircle, Star, FileText, Users, HandshakeIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

interface Expert {
    id: string;
    full_name: string;
    avatar_url: string;
    role: string;
    specialization: string;
    is_verified_expert: boolean;
    popularity_score: number;
    bio?: string | null;
    article_count: number;
    consultation_count: number;
}

interface PageStats {
    verifiedCount: number;
    consultationCount: number;
}

export default function ExpertsPage() {
    const [experts, setExperts] = useState<Expert[]>([]);
    const [stats, setStats] = useState<PageStats>({ verifiedCount: 0, consultationCount: 0 });
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

                // Fetch expert stats via RPC (security definer) to bypass RLS for counts
                const { data: expertStats, error: statsError } = await supabase
                    .rpc('get_expert_stats', { expert_ids: expertIds });

                if (statsError) {
                    console.error("Error fetching expert stats via RPC:", statsError);
                }

                const rankedExperts = expertsData.map((expert: any) => {
                    const statsForExpert = expertStats?.find((s: any) => s.expert_id === expert.id);
                    const articleCount = Number(statsForExpert?.article_count || 0);
                    const consultationCount = Number(statsForExpert?.consultation_count || 0);
                    
                    // Simulated popularity score for now based on stats
                    const score = (articleCount * 5) + (consultationCount * 10);

                    return {
                        id: expert.id,
                        full_name: expert.full_name,
                        avatar_url: expert.avatar_url,
                        role: expert.role,
                        specialization: expert.special_note || "Uzman",
                        is_verified_expert: expert.is_verified_expert,
                        bio: expert.bio || expert.special_note,
                        popularity_score: score,
                        article_count: articleCount,
                        consultation_count: consultationCount
                    };
                }).sort((a, b) => b.popularity_score - a.popularity_score);

                setExperts(rankedExperts);

                // Fetch global total consultation count via RPC
                const { data: totalConsults, error: globalStatsError } = await supabase
                    .rpc('get_total_consultation_count');

                if (globalStatsError) {
                    console.error("Error fetching global stats via RPC:", globalStatsError);
                }

                setStats({
                    verifiedCount: rankedExperts.length,
                    consultationCount: Number(totalConsults || 0)
                });
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
            <div className="bg-[#F9FAFB] min-h-screen">
                <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-24 md:pb-12">
                    
                    {/* Header Section */}
                    <div className="flex flex-col gap-1 mb-8">
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Uzmanlar</h1>
                            <BadgeCheck className="w-6 h-6 text-[#14B8A6] fill-[#14B8A6]/10" />
                        </div>
                        <p className="text-gray-500 text-sm font-medium italic">
                            Doğrulanmış özel eğitim uzmanları ve danışmanları
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-8">
                        
                        {/* LEFT COLUMN: Main Content */}
                        <div className="space-y-8">
                            
                            {/* Control Bar: Search & Filters */}
                            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="relative w-full md:w-96">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        placeholder="Uzman ara..."
                                        className="pl-11 h-11 bg-gray-50 border-transparent rounded-xl text-sm focus:ring-[#14B8A6]/20 transition-all"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <select className="h-11 px-4 bg-gray-50 border-transparent rounded-xl text-sm font-medium text-gray-600 focus:ring-0 outline-none cursor-pointer">
                                        <option>Uzmanlık Alanı</option>
                                        <option>Otizm</option>
                                        <option>Dil ve Konuşma</option>
                                        <option>Özel Öğrenme</option>
                                    </select>
                                    <select className="h-11 px-4 bg-gray-50 border-transparent rounded-xl text-sm font-medium text-gray-600 focus:ring-0 outline-none cursor-pointer">
                                        <option>Sırala: Popülerlik</option>
                                        <option>Sırala: Yeni</option>
                                        <option>Sırala: Puan</option>
                                    </select>
                                </div>
                            </div>

                            {/* Summary Stats (Dashboard Cards) */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-[#14B8A6] p-5 rounded-2xl text-white shadow-lg shadow-[#14B8A6]/10 flex flex-col gap-1">
                                    <Users className="w-5 h-5 mb-2 opacity-80" />
                                    <span className="text-2xl font-bold">{stats.verifiedCount}</span>
                                    <span className="text-xs font-medium opacity-80 uppercase tracking-wider">Doğrulanmış Uzman</span>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1">
                                    <HandshakeIcon className="w-5 h-5 mb-2 text-[#14B8A6]" />
                                    <span className="text-2xl font-bold text-gray-900">{stats.consultationCount > 0 ? stats.consultationCount : "1.200+"}</span>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Toplam Danışma</span>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1">
                                    <Star className="w-5 h-5 mb-2 text-[#14B8A6] fill-[#14B8A6]" />
                                    <span className="text-2xl font-bold text-gray-900">4.8</span>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ortalama Puan</span>
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="w-10 h-10 text-[#14B8A6] animate-spin" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {filteredExperts.map((expert, index) => (
                                        <div
                                            key={expert.id}
                                            className="group bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:shadow-[#14B8A6]/5 transition-all duration-500 flex flex-col"
                                        >
                                            {/* Expert Card Header */}
                                            <div className="flex gap-4 mb-5">
                                                <div className="relative shrink-0">
                                                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-gray-100 group-hover:scale-105 transition-transform duration-500">
                                                        <Avatar className="w-full h-full text-lg">
                                                            <AvatarImage src={expert.avatar_url} />
                                                            <AvatarFallback className="bg-[#14B8A6] text-white font-bold">
                                                                {expert.full_name?.[0]}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <h3 className="text-base font-bold text-gray-900 group-hover:text-[#14B8A6] transition-colors truncate">
                                                            {expert.full_name}
                                                        </h3>
                                                        {expert.is_verified_expert && (
                                                            <BadgeCheck className="w-4 h-4 text-[#14B8A6] fill-[#14B8A6]/5 shrink-0" />
                                                        )}
                                                    </div>
                                                    <p className="text-[12px] text-gray-500 font-medium mb-2 truncate">
                                                        {expert.specialization}
                                                    </p>
                                                    <div className="flex items-center gap-1">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star key={i} className={`w-3 h-3 ${i < 4 ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                                                        ))}
                                                        <span className="text-[11px] font-bold text-gray-400 ml-1">4.9 • 120 Yorum</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Tags */}
                                            <div className="flex flex-wrap gap-1.5 mb-5">
                                                {(expert.specialization !== "Uzman" ? expert.specialization.split(/[ ,]+/) : ["Özel Eğitim", "Danışmanlık"]).slice(0, 3).map(tag => (
                                                    <span key={tag} className="px-2.5 py-1 bg-[#14B8A6]/5 text-[#14B8A6] text-[10px] font-bold rounded-full border border-[#14B8A6]/10">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Bio Snippet */}
                                            <p className="text-gray-500 text-[13px] leading-relaxed line-clamp-2 mb-6 min-h-[40px]">
                                                {expert.bio || "Özel eğitim ve rehabilitasyon süreçlerinde tecrübe ile ailelere ve çocuklara destek sağlıyorum."}
                                            </p>

                                            {/* Stats Row */}
                                            <div className="flex items-center gap-6 mb-6 pt-5 border-t border-gray-50">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-gray-300" />
                                                    <span className="text-[11px] font-bold text-gray-500">{expert.article_count} Makale</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <MessageCircle className="w-4 h-4 text-gray-300" />
                                                    <span className="text-[11px] font-bold text-gray-500">{expert.consultation_count} Danışma</span>
                                                </div>
                                            </div>

                                            {/* Buttons Section */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <Link href={`/profile/${expert.id}`} className="w-full">
                                                    <Button variant="outline" className="w-full h-10 text-[13px] font-bold border-gray-200 text-gray-600 hover:bg-[#14B8A6]/5 hover:text-[#14B8A6] hover:border-[#14B8A6] rounded-xl transition-all">
                                                        Profili Gör
                                                    </Button>
                                                </Link>
                                                <Link href={`/messages?userId=${expert.id}`} className="w-full">
                                                    <Button className="w-full h-10 text-[13px] font-bold bg-[#14B8A6] hover:bg-[#0D9488] text-white rounded-xl shadow-lg shadow-[#14B8A6]/15 transition-all">
                                                        Mesaj Gönder
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Empty State */}
                            {!loading && filteredExperts.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                        <Search className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">Uzman Bulunamadı</h3>
                                    <p className="text-gray-500 max-w-xs px-6">Aradığınız kriterlere uygun doğrulanmış uzman bulunamadı.</p>
                                </div>
                            )}
                        </div>

                        {/* RIGHT COLUMN: Sidebar Widgets */}
                        <div className="space-y-8">
                            
                            {/* Most Read Experts */}
                            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                                <h4 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-[#14B8A6]" />
                                    En Çok Okunan Uzmanlar
                                </h4>
                                <div className="space-y-5">
                                    {experts.slice(0, 3).map((expert) => (
                                        <Link 
                                            href={`/profile/${expert.id}`} 
                                            key={expert.id}
                                            className="flex items-center gap-3 group"
                                        >
                                            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                                                <Avatar className="w-full h-full rounded-none">
                                                    <AvatarImage src={expert.avatar_url} />
                                                    <AvatarFallback className="bg-gray-100 text-gray-400 text-xs font-bold">
                                                        {expert.full_name?.[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-gray-900 group-hover:text-[#14B8A6] transition-colors truncate">
                                                    {expert.full_name}
                                                </p>
                                                <p className="text-[11px] text-gray-400 font-medium truncate italic lowercase">
                                                    @{expert.role}
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            {/* Become an Expert CTA */}
                            <div className="bg-[#0F172A] rounded-2xl p-6 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#14B8A6]/20 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:bg-[#14B8A6]/30 transition-all duration-500" />
                                <div className="relative z-10 flex flex-col gap-4">
                                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                                        <BadgeCheck className="w-6 h-6 text-[#14B8A6]" />
                                    </div>
                                    <div>
                                        <h5 className="text-lg font-bold text-white mb-1.5">Uzman mısınız?</h5>
                                        <p className="text-gray-400 text-xs leading-relaxed">
                                            Topluluğumuza katılarak bilginizi paylaşın ve binlerce ebeveyne ışık tutun.
                                        </p>
                                    </div>
                                    <Button className="w-full bg-white text-gray-900 hover:bg-gray-100 font-black text-xs uppercase tracking-widest h-11 rounded-xl transition-all">
                                        Hemen Başvur
                                    </Button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
