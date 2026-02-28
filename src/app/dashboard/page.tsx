"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/utils/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    FileText, MessageCircle, BookOpen, Users, TrendingUp,
    ArrowRight, Heart, MessageSquare, Loader2, Sparkles,
    Clock, Star
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface DashboardStats {
    postCount: number;
    unreadMessages: number;
    articleCount: number;
    memberCount: number;
}

interface TrendingTopic {
    category: string;
    count: number;
}

interface RecentActivity {
    type: "like" | "comment" | "article" | "message";
    actor_name: string;
    actor_avatar: string | null;
    content: string;
    created_at: string;
}

interface FeaturedArticle {
    id: string;
    title: string;
    summary: string;
    category: string;
    author_name: string;
    author_avatar: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MOTIVATIONAL_QUOTES = [
    "Her çocuk bir mucizedir. 🌟",
    "Sabır, eğitimin en güçlü silahıdır. 💪",
    "Küçük adımlar, büyük başarılara götürür. 🚀",
    "Birlikte daha güçlüyüz. 🤝",
    "Farklılıklar zenginliktir. ✨",
    "Eğitim, geleceğe yapılan en büyük yatırımdır. 📚",
];

export default function DashboardPage() {
    const router = useRouter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [profile, setProfile] = useState<any>(null);
    const [stats, setStats] = useState<DashboardStats>({ postCount: 0, unreadMessages: 0, articleCount: 0, memberCount: 0 });
    const [trending, setTrending] = useState<TrendingTopic[]>([]);
    const [activities, setActivities] = useState<RecentActivity[]>([]);
    const [featuredArticle, setFeaturedArticle] = useState<FeaturedArticle | null>(null);
    const [loading, setLoading] = useState(true);
    const [quote] = useState(() => MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);

    useEffect(() => {
        const fetchDashboard = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }

            // Fetch profile
            const { data: profileData } = await supabase
                .from("profiles")
                .select("id, full_name, avatar_url, role")
                .eq("id", user.id)
                .single();
            setProfile(profileData);

            // Fetch stats in parallel
            const [postsRes, messagesRes, articlesRes, membersRes] = await Promise.all([
                supabase.from("posts").select("id", { count: "exact", head: true }),
                supabase.from("messages").select("id", { count: "exact", head: true })
                    .eq("receiver_id", user.id).eq("is_read", false),
                supabase.from("knowledge_articles").select("id", { count: "exact", head: true }).eq("status", "published"),
                supabase.from("profiles").select("id", { count: "exact", head: true }),
            ]);

            setStats({
                postCount: postsRes.count || 0,
                unreadMessages: messagesRes.count || 0,
                articleCount: articlesRes.count || 0,
                memberCount: membersRes.count || 0,
            });

            // Trending topics (categories with most posts)
            const { data: trendData } = await supabase
                .from("posts")
                .select("category")
                .not("category", "is", null)
                .order("created_at", { ascending: false })
                .limit(50);

            if (trendData) {
                const catCounts: Record<string, number> = {};
                trendData.forEach((p: { category: string }) => {
                    catCounts[p.category] = (catCounts[p.category] || 0) + 1;
                });
                const sorted = Object.entries(catCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 4)
                    .map(([category, count]) => ({ category, count }));
                setTrending(sorted);
            }

            // Featured article
            const { data: articleData } = await supabase
                .from("knowledge_articles")
                .select("id, title, summary, category, profiles!knowledge_articles_author_id_fkey(full_name, avatar_url)")
                .eq("status", "published")
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (articleData) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const authorProfile = Array.isArray(articleData.profiles) ? articleData.profiles[0] : articleData.profiles as any;
                setFeaturedArticle({
                    id: articleData.id,
                    title: articleData.title,
                    summary: articleData.summary || "",
                    category: articleData.category,
                    author_name: authorProfile?.full_name || "Anonim",
                    author_avatar: authorProfile?.avatar_url || null,
                });
            }

            // Recent activities (latest likes, comments on user's posts)
            const { data: recentLikes } = await supabase
                .from("post_likes")
                .select("created_at, profiles!post_likes_user_id_fkey(full_name, avatar_url), posts!inner(author_id, content)")
                .eq("posts.author_id", user.id)
                .order("created_at", { ascending: false })
                .limit(5);

            const acts: RecentActivity[] = [];
            if (recentLikes) {
                recentLikes.forEach((like: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                    const likeProfile = Array.isArray(like.profiles) ? like.profiles[0] : like.profiles;
                    const post = Array.isArray(like.posts) ? like.posts[0] : like.posts;
                    if (likeProfile && post) {
                        acts.push({
                            type: "like",
                            actor_name: likeProfile.full_name,
                            actor_avatar: likeProfile.avatar_url,
                            content: (post.content || "").slice(0, 40) + "...",
                            created_at: like.created_at,
                        });
                    }
                });
            }
            setActivities(acts.slice(0, 5));
            setLoading(false);
        };

        fetchDashboard();
    }, [router]);

    if (loading) {
        return (
            <AppShell>
                <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#7b9e89]" />
                </div>
            </AppShell>
        );
    }

    const statCards = [
        { label: "Gönderi", value: stats.postCount, icon: FileText, color: "text-[#7b9e89]", bg: "bg-[#7b9e89]/10", ring: "ring-[#7b9e89]/20" },
        { label: "Okunmamış", value: stats.unreadMessages, icon: MessageCircle, color: "text-[#818CF8]", bg: "bg-[#818CF8]/10", ring: "ring-[#818CF8]/20" },
        { label: "Makale", value: stats.articleCount, icon: BookOpen, color: "text-[#6ba88f]", bg: "bg-[#6ba88f]/10", ring: "ring-[#6ba88f]/20" },
        { label: "Topluluk", value: stats.memberCount, icon: Users, color: "text-[#f2a68d]", bg: "bg-[#f2a68d]/10", ring: "ring-[#f2a68d]/20" },
    ];

    const activityIcons: Record<string, React.ReactNode> = {
        like: <Heart className="h-3.5 w-3.5 text-[#f2a68d] fill-[#f2a68d]" />,
        comment: <MessageSquare className="h-3.5 w-3.5 text-[#818CF8]" />,
        article: <BookOpen className="h-3.5 w-3.5 text-[#6ba88f]" />,
        message: <MessageCircle className="h-3.5 w-3.5 text-[#7b9e89]" />,
    };

    return (
        <AppShell>
            <div className="max-w-4xl mx-auto py-6 sm:py-10 px-4 space-y-8 animate-fade-up">

                {/* Welcome Card - Soothing Gradient */}
                <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#7b9e89] via-[#8ba898] to-[#9abfa7] p-6 sm:p-10 text-white shadow-[0_8px_30px_rgb(123,158,137,0.25)]">
                    {/* Decorative blurred background shapes */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#f2a68d]/20 rounded-full -mr-20 -mt-20 blur-3xl mix-blend-overlay" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#a2c1b1]/30 rounded-full -ml-16 -mb-16 blur-3xl mix-blend-overlay" />

                    {/* Atmospheric pattern */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-3">
                            <Avatar className="h-14 w-14 border-2 border-white/40 shadow-xl">
                                <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
                                <AvatarFallback className="bg-white/20 text-white font-bold text-lg backdrop-blur-md">
                                    {profile?.full_name?.[0]?.toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-sm">
                                    Hoş geldin, {profile?.full_name?.split(" ")[0]}! ✨
                                </h1>
                                <p className="text-[#eaf2ed] text-[15px] font-medium mt-1 tracking-wide">{quote}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                    {statCards.map((stat) => (
                        <Card key={stat.label} className="p-5 rounded-[28px] border border-stone-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl hover:shadow-stone-200/50 transition-all duration-300 hover:-translate-y-1 cursor-default group bg-white">
                            <div className={`w-12 h-12 ${stat.bg} ${stat.ring} ring-1 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                            </div>
                            <p className="text-2xl font-bold text-stone-900 tabular-nums">{stat.value}</p>
                            <p className="text-xs font-medium text-stone-500 mt-0.5">{stat.label}</p>
                        </Card>
                    ))}
                </div>

                {/* Two Column: Trending + Featured Article */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Trending */}
                    <Card className="p-6 sm:p-8 rounded-[32px] border-transparent shadow-[0_8px_30px_rgb(0,0,0,0.03)] bg-white h-full flex flex-col">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-[#f2a68d]/10 rounded-2xl flex items-center justify-center">
                                <TrendingUp className="h-5 w-5 text-[#f2a68d]" />
                            </div>
                            <h2 className="font-bold text-stone-800 text-base">Gündem Konuları</h2>
                        </div>
                        {trending.length > 0 ? (
                            <div className="space-y-3 flex-1">
                                {trending.map((t, i) => (
                                    <Link key={t.category} href={`/feed?category=${t.category}`}
                                        className="flex items-center justify-between p-3 rounded-2xl hover:bg-stone-50 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-stone-300 w-5">#{i + 1}</span>
                                            <span className="text-sm font-bold text-stone-600 group-hover:text-[#7b9e89] transition-colors">{t.category}</span>
                                        </div>
                                        <span className="text-xs font-semibold text-[#8ba898] bg-[#7b9e89]/10 px-3 py-1.5 rounded-full">{t.count} gönderi</span>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-stone-400 italic">Henüz gündem konusu yok.</p>
                        )}
                    </Card>

                    {/* Featured Article */}
                    <Card className="p-6 sm:p-8 rounded-[32px] border-transparent shadow-[0_8px_30px_rgb(0,0,0,0.03)] bg-white relative overflow-hidden group/card h-full flex flex-col">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#f8c9b9]/20 to-transparent opacity-50 pointer-events-none" />

                        <div className="flex items-center gap-3 mb-6 relative z-10">
                            <div className="w-10 h-10 bg-[#818CF8]/10 rounded-2xl flex items-center justify-center">
                                <Sparkles className="h-5 w-5 text-[#818CF8]" />
                            </div>
                            <h2 className="font-bold text-stone-800 text-base">Önerilen Makale</h2>
                        </div>

                        {featuredArticle ? (
                            <Link href={`/knowledge/${featuredArticle.id}`} className="flex flex-col flex-1 relative z-10 group">
                                <div className="mb-4">
                                    <span className="text-xs font-bold tracking-wide text-[#6ba88f] bg-[#6ba88f]/10 px-3 py-1.5 rounded-full">
                                        {featuredArticle.category}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-stone-800 mb-3 group-hover:text-[#7b9e89] transition-colors leading-snug">
                                    {featuredArticle.title}
                                </h3>
                                <p className="text-sm text-stone-500 leading-relaxed line-clamp-2 mb-6 flex-1">
                                    {featuredArticle.summary}
                                </p>
                                <div className="flex items-center justify-between mt-auto">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                                            <AvatarImage src={featuredArticle.author_avatar || undefined} />
                                            <AvatarFallback className="text-xs bg-[#fef3ea] text-[#f2a68d] font-bold">{featuredArticle.author_name[0]}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-bold text-stone-600">{featuredArticle.author_name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-sm font-bold text-[#7b9e89] group-hover:gap-2.5 transition-all bg-[#7b9e89]/5 p-2 px-4 rounded-xl group-hover:bg-[#7b9e89]/10">
                                        Oku <ArrowRight className="h-4 w-4" />
                                    </div>
                                </div>
                            </Link>
                        ) : (
                            <p className="text-sm text-stone-400 italic">Henüz makale yok.</p>
                        )}
                    </Card>
                </div>

                {/* Recent Activities */}
                <Card className="p-6 sm:p-8 rounded-[32px] border-transparent shadow-[0_8px_30px_rgb(0,0,0,0.03)] bg-white">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#f8c9b9]/20 rounded-2xl flex items-center justify-center">
                                <Clock className="h-5 w-5 text-[#f2a68d]" />
                            </div>
                            <h2 className="font-bold text-stone-800 text-base">Son Aktiviteler</h2>
                        </div>
                        <Link href="/feed" className="text-sm font-bold text-[#7b9e89] hover:text-[#6ba88f] transition-colors flex items-center gap-1.5 bg-[#7b9e89]/5 p-2 px-4 rounded-xl hover:bg-[#7b9e89]/10">
                            Tümünü Gör <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                    {activities.length > 0 ? (
                        <div className="space-y-2">
                            {activities.map((act, i) => (
                                <div key={i} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-stone-50/80 transition-colors">
                                    <Avatar className="h-10 w-10 shrink-0 border border-stone-100 shadow-sm">
                                        <AvatarImage src={act.actor_avatar || undefined} className="object-cover" />
                                        <AvatarFallback className="text-xs bg-[#eaf2ed] text-[#7b9e89] font-bold">{act.actor_name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[15px] text-stone-700">
                                            <span className="font-bold text-stone-900">{act.actor_name}</span>
                                            {" "}
                                            {act.type === "like" && "gönderinizi beğendi"}
                                            {act.type === "comment" && "yorum yazdı"}
                                        </p>
                                        <p className="text-sm text-stone-500 truncate mt-0.5">{act.content}</p>
                                    </div>
                                    <div className="flex items-center gap-2.5 shrink-0 bg-stone-50 px-3 py-1.5 rounded-full">
                                        {activityIcons[act.type]}
                                        <span className="text-xs text-stone-500 font-semibold">
                                            {formatDistanceToNow(new Date(act.created_at), { locale: tr, addSuffix: false })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-stone-50/50 rounded-2xl border border-dashed border-stone-200">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mx-auto mb-4">
                                <Star className="h-8 w-8 text-[#f2a68d]/50" />
                            </div>
                            <p className="text-sm font-bold text-stone-600">Henüz aktivite yok.</p>
                            <p className="text-sm text-stone-400 mt-1">Toplulukla etkileşime girerek başlayın!</p>
                        </div>
                    )}
                </Card>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <Link href="/feed" className="flex items-center gap-4 p-5 sm:p-6 bg-teal-50 hover:bg-teal-100 border border-teal-100/50 rounded-[28px] transition-all group shadow-sm shadow-teal-100/50 hover:shadow-md hover:-translate-y-1">
                        <FileText className="h-5 w-5 text-teal-600" />
                        <span className="text-sm font-semibold text-teal-700 group-hover:text-teal-800">Akışa Git</span>
                    </Link>
                    <Link href="/messages" className="flex items-center gap-4 p-5 sm:p-6 bg-zinc-50 hover:bg-zinc-100 border border-zinc-100/50 rounded-[28px] transition-all group shadow-sm shadow-zinc-100/50 hover:shadow-md hover:-translate-y-1">
                        <MessageCircle className="h-6 w-6 text-zinc-600 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-bold text-zinc-700 group-hover:text-zinc-900">Mesajlar</span>
                    </Link>
                    <Link href="/knowledge" className="flex items-center gap-4 p-5 sm:p-6 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100/50 rounded-[28px] transition-all group shadow-sm shadow-emerald-100/50 hover:shadow-md hover:-translate-y-1 col-span-2 sm:col-span-1">
                        <BookOpen className="h-6 w-6 text-emerald-600 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-bold text-emerald-700 group-hover:text-emerald-900">Kütüphane</span>
                    </Link>
                </div>
            </div>
        </AppShell>
    );
}
