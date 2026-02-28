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
                    <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
                </div>
            </AppShell>
        );
    }

    const statCards = [
        { label: "Gönderi", value: stats.postCount, icon: FileText, color: "text-teal-600", bg: "bg-teal-50", ring: "ring-teal-100" },
        { label: "Okunmamış", value: stats.unreadMessages, icon: MessageCircle, color: "text-indigo-600", bg: "bg-indigo-50", ring: "ring-indigo-100" },
        { label: "Makale", value: stats.articleCount, icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-100" },
        { label: "Topluluk", value: stats.memberCount, icon: Users, color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-100" },
    ];

    const activityIcons: Record<string, React.ReactNode> = {
        like: <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />,
        comment: <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />,
        article: <BookOpen className="h-3.5 w-3.5 text-emerald-500" />,
        message: <MessageCircle className="h-3.5 w-3.5 text-teal-500" />,
    };

    return (
        <AppShell>
            <div className="max-w-4xl mx-auto py-4 sm:py-6 px-4 space-y-5 sm:space-y-6 animate-fade-up">

                {/* Welcome Card */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 via-teal-600 to-indigo-600 p-5 sm:p-7 text-white shadow-xl shadow-teal-200/30">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-2xl" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/10 rounded-full -ml-16 -mb-16 blur-2xl" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-3">
                            <Avatar className="h-12 w-12 border-2 border-white/30 shadow-lg">
                                <AvatarImage src={profile?.avatar_url || undefined} />
                                <AvatarFallback className="bg-white/20 text-white font-bold text-lg">
                                    {profile?.full_name?.[0]?.toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                                    Hoş geldin, {profile?.full_name?.split(" ")[0]}! 👋
                                </h1>
                                <p className="text-teal-100 text-sm font-medium">{quote}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {statCards.map((stat) => (
                        <Card key={stat.label} className="p-4 rounded-2xl border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-default group">
                            <div className={`w-10 h-10 ${stat.bg} ${stat.ring} ring-1 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                            </div>
                            <p className="text-2xl font-bold text-stone-900 tabular-nums">{stat.value}</p>
                            <p className="text-xs font-medium text-stone-500 mt-0.5">{stat.label}</p>
                        </Card>
                    ))}
                </div>

                {/* Two Column: Trending + Featured Article */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Trending */}
                    <Card className="p-5 rounded-2xl border-stone-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-orange-500" />
                            </div>
                            <h2 className="font-bold text-stone-800 text-sm">Gündem Konuları</h2>
                        </div>
                        {trending.length > 0 ? (
                            <div className="space-y-2.5">
                                {trending.map((t, i) => (
                                    <Link key={t.category} href={`/feed?category=${t.category}`}
                                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-stone-50 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-stone-400 w-5">#{i + 1}</span>
                                            <span className="text-sm font-semibold text-stone-700 group-hover:text-teal-600 transition-colors">{t.category}</span>
                                        </div>
                                        <span className="text-xs font-medium text-stone-400 bg-stone-50 px-2 py-1 rounded-full">{t.count} gönderi</span>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-stone-400 italic">Henüz gündem konusu yok.</p>
                        )}
                    </Card>

                    {/* Featured Article */}
                    <Card className="p-5 rounded-2xl border-stone-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                                <Sparkles className="h-4 w-4 text-indigo-500" />
                            </div>
                            <h2 className="font-bold text-stone-800 text-sm">Önerilen Makale</h2>
                        </div>
                        {featuredArticle ? (
                            <Link href={`/knowledge/${featuredArticle.id}`} className="block group">
                                <div className="mb-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                        {featuredArticle.category}
                                    </span>
                                </div>
                                <h3 className="font-bold text-stone-800 mb-2 group-hover:text-teal-600 transition-colors leading-snug">
                                    {featuredArticle.title}
                                </h3>
                                <p className="text-xs text-stone-500 leading-relaxed line-clamp-2 mb-3">
                                    {featuredArticle.summary}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={featuredArticle.author_avatar || undefined} />
                                        <AvatarFallback className="text-[10px] bg-stone-100">{featuredArticle.author_name[0]}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-medium text-stone-600">{featuredArticle.author_name}</span>
                                </div>
                                <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-teal-600 group-hover:gap-2.5 transition-all">
                                    Makaleyi Oku <ArrowRight className="h-3.5 w-3.5" />
                                </div>
                            </Link>
                        ) : (
                            <p className="text-sm text-stone-400 italic">Henüz makale yok.</p>
                        )}
                    </Card>
                </div>

                {/* Recent Activities */}
                <Card className="p-5 rounded-2xl border-stone-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center">
                                <Clock className="h-4 w-4 text-rose-500" />
                            </div>
                            <h2 className="font-bold text-stone-800 text-sm">Son Aktiviteler</h2>
                        </div>
                        <Link href="/feed" className="text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors flex items-center gap-1">
                            Tümünü Gör <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>
                    {activities.length > 0 ? (
                        <div className="space-y-1">
                            {activities.map((act, i) => (
                                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-stone-50 transition-colors">
                                    <Avatar className="h-8 w-8 shrink-0">
                                        <AvatarImage src={act.actor_avatar || undefined} />
                                        <AvatarFallback className="text-[10px] bg-stone-100">{act.actor_name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-stone-700">
                                            <span className="font-semibold">{act.actor_name}</span>
                                            {" "}
                                            {act.type === "like" && "gönderinizi beğendi"}
                                            {act.type === "comment" && "yorum yazdı"}
                                        </p>
                                        <p className="text-xs text-stone-400 truncate">{act.content}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {activityIcons[act.type]}
                                        <span className="text-[10px] text-stone-400 font-medium">
                                            {formatDistanceToNow(new Date(act.created_at), { locale: tr, addSuffix: false })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Star className="h-10 w-10 text-stone-200 mx-auto mb-3" />
                            <p className="text-sm text-stone-400">Henüz aktivite yok.</p>
                            <p className="text-xs text-stone-300 mt-1">Paylaşım yaparak başlayın!</p>
                        </div>
                    )}
                </Card>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Link href="/feed" className="flex items-center gap-3 p-4 bg-teal-50 hover:bg-teal-100 rounded-2xl transition-all group">
                        <FileText className="h-5 w-5 text-teal-600" />
                        <span className="text-sm font-semibold text-teal-700 group-hover:text-teal-800">Akışa Git</span>
                    </Link>
                    <Link href="/messages" className="flex items-center gap-3 p-4 bg-indigo-50 hover:bg-indigo-100 rounded-2xl transition-all group">
                        <MessageCircle className="h-5 w-5 text-indigo-600" />
                        <span className="text-sm font-semibold text-indigo-700 group-hover:text-indigo-800">Mesajlar</span>
                    </Link>
                    <Link href="/knowledge" className="flex items-center gap-3 p-4 bg-emerald-50 hover:bg-emerald-100 rounded-2xl transition-all group col-span-2 sm:col-span-1">
                        <BookOpen className="h-5 w-5 text-emerald-600" />
                        <span className="text-sm font-semibold text-emerald-700 group-hover:text-emerald-800">Kütüphane</span>
                    </Link>
                </div>
            </div>
        </AppShell>
    );
}
