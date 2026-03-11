"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Bookmark, BookOpen, Trash2, Loader2, ArrowUp, Clock, Type, ThumbsUp, ChevronLeft, Check } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { cn } from "@/utils/cn";
// We would usually use a markdown renderer here, but for simplicity we'll just render text or very basic HTML
// For a real app, 'react-markdown' is recommended.
// I'll handle newlines as paragraphs for now.

interface ArticleDetail {
    id: string;
    title: string;
    content: string;
    image_url: string | null;
    category: string;
    created_at: string;
    author_id: string;
    author: {
        full_name: string;
        avatar_url: string | null;
        special_note?: string; // e.g. "Uzman Psikolog"
    } | null;
}

export default function ArticleDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;
    const [article, setArticle] = useState<ArticleDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [fontSizeLevel, setFontSizeLevel] = useState(1); // 0 = standard, 1 = large, 2 = xl
    const [showScrollTop, setShowScrollTop] = useState(false);
    
    // Simulate read time (normally calculated based on words)
    const readTime = article?.content ? Math.max(3, Math.ceil(article.content.split(' ').length / 200)) : 5;

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 400);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (!id) return;

        const fetchArticle = async () => {
            const { data, error } = await createClient()
                .from("articles")
                .select(`
                    id,
                    title,
                    content,
                    image_url,
                    category,
                    created_at,
                    author:author_id (
                        full_name,
                        avatar_url,
                        special_note
                    )
                `)
                .eq("id", id)
                .single();

            if (error) {
                console.error("Error fetching article:", error);
            } else {
                const mappedArticle = {
                    ...data,
                    author: Array.isArray(data.author) ? data.author[0] : data.author
                } as ArticleDetail;
                setArticle(mappedArticle);
            }
            setLoading(false);
        };

        const checkUserStatus = async () => {
            const { data: { user } } = await createClient().auth.getUser();
            if (user) {
                setCurrentUserId(user.id);
                // Check if admin
                const { data } = await createClient().from('profiles').select('is_admin').eq('id', user.id).single();
                if (data) setIsAdmin(!!data.is_admin);
            }
        };

        fetchArticle();
        checkUserStatus();
    }, [id]);

    const handleDeleteArticle = async () => {
        if (!confirm("Bu makaleyi silmek istediğinize emin misiniz?")) return;
        setIsDeleting(true);
        try {
            const { error } = await createClient().from('articles').delete().eq('id', id);
            if (error) throw error;
            router.push('/knowledge');
        } catch (error) {
            console.error("Error deleting article:", error);
            alert("Silinirken hata oluştu.");
            setIsDeleting(false);
        }
    };

    if (loading) {
        return (
            <AppShell fullWidth={true}>
                <article className="h-full bg-[#fdfcfaf5] pb-24 relative overflow-hidden animate-pulse">
                    {/* Skeleton Hero */}
                    <div className="h-[60vh] md:h-[70vh] w-full bg-slate-200"></div>
                    {/* Skeleton Content */}
                    <div className="max-w-4xl mx-auto -mt-32 relative z-10 px-4 sm:px-6">
                        <div className="bg-white rounded-t-[40px] rounded-b-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-8 sm:p-12 md:p-16 min-h-screen">
                            <div className="h-10 w-3/4 bg-slate-100 rounded-lg mb-6 mx-auto"></div>
                            <div className="h-6 w-1/3 bg-slate-100 rounded-full mb-16 mx-auto"></div>
                            <div className="space-y-6">
                                <div className="h-4 w-full bg-slate-50 rounded"></div>
                                <div className="h-4 w-full bg-slate-50 rounded"></div>
                                <div className="h-4 w-4/5 bg-slate-50 rounded"></div>
                                <div className="h-4 w-full bg-slate-50 rounded mt-8"></div>
                                <div className="h-4 w-5/6 bg-slate-50 rounded"></div>
                            </div>
                        </div>
                    </div>
                </article>
            </AppShell>
        );
    }

    if (!article) return (
        <AppShell fullWidth={true}>
            <div className="h-full overflow-y-auto bg-gray-50 flex items-center justify-center px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <BookOpen className="h-8 w-8 text-gray-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Makale Bulunamadı</h1>
                    <p className="text-slate-500 mb-8">Aradığınız makale silinmiş veya taşınmış olabilir.</p>
                    <Link href="/knowledge" className="inline-flex items-center justify-center w-full px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl transition-colors">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Kütüphaneye Dön
                    </Link>
                </div>
            </div>
        </AppShell>
    );

    return (
        <AppShell fullWidth={true}>
            <article className="h-full overflow-y-auto bg-white relative scroll-smooth selection:bg-[#4ade80]/30 selection:text-slate-900 pb-32">
                <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 md:pt-16">
                    
                    {/* Top Native Back Button */}
                    <div className="mb-8 md:mb-12">
                        <Link href="/knowledge" className="inline-flex items-center text-sm font-semibold text-gray-400 hover:text-gray-900 transition-colors group">
                            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                            Kütüphaneye Dön
                        </Link>
                    </div>

                    {/* Editorial Header */}
                    <header className="mb-10 md:mb-14 text-center md:text-left">
                        <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-none mb-6 px-4 py-1.5 rounded-full text-[13px] font-bold tracking-widest uppercase shadow-sm">
                            {article.category}
                        </Badge>
                        <h1 className="text-4xl sm:text-5xl md:text-[56px] font-black text-slate-900 leading-[1.15] mb-8 tracking-[-0.02em]">
                            {article.title}
                        </h1>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-y border-gray-100 py-6">
                            <div className="flex items-center justify-center md:justify-start gap-4">
                                <Avatar className="h-12 w-12 border border-gray-100 shadow-sm">
                                    <AvatarImage src={article.author?.avatar_url || undefined} className="object-cover" />
                                    <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold">{article.author?.full_name?.[0]?.toUpperCase() || "Y"}</AvatarFallback>
                                </Avatar>
                                <div className="text-left">
                                    <div className="font-bold text-slate-900 text-[15px]">{article.author?.full_name}</div>
                                    <div className="text-[13px] font-medium text-slate-500 mt-0.5 flex items-center gap-2">
                                        <span>{article.author?.special_note || "Editör"}</span>
                                        <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-slate-300"></span>
                                        <span>{formatDistanceToNow(new Date(article.created_at), { addSuffix: true, locale: tr })}</span>
                                        <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-slate-300"></span>
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {readTime} dk okuma</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>
                </div>

                {/* Crisp Hero Image - Center Aligned & Wide */}
                <div className="max-w-[1200px] mx-auto px-4 md:px-8 mb-16 md:mb-24">
                    <div className="relative w-full aspect-[16/9] md:aspect-[21/9] rounded-[24px] md:rounded-[40px] overflow-hidden shadow-sm border border-gray-100/50 bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                            src={article.image_url || "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?ixlib=rb-4.0.3&auto=format&fit=crop&w=2400&q=80"} 
                            alt={article.title} 
                            className="absolute inset-0 w-full h-full object-cover select-none"
                            loading="eager"
                        />
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
                        
                        {/* Left Sticky Sidebar (Desktop only) */}
                        <aside className="hidden lg:block w-16 shrink-0 relative z-20">
                            <div className="sticky top-32 flex flex-col items-center gap-4 py-8">
                                <button 
                                    className="w-12 h-12 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all group font-serif font-black"
                                    onClick={() => setFontSizeLevel(prev => (prev + 1) % 3)}
                                    title="Metin Boyutunu Değiştir"
                                >
                                    <Type className="h-5 w-5 transition-transform group-hover:scale-110" />
                                </button>

                                {(currentUserId && article && currentUserId === article.author_id) && (
                                    <>
                                        <hr className="w-8 border-gray-100 my-1" />
                                        <button 
                                            onClick={handleDeleteArticle} disabled={isDeleting}
                                            className="w-12 h-12 rounded-full flex items-center justify-center text-gray-300 hover:text-red-600 hover:bg-red-50 transition-all group"
                                            title="Makaleyi Sil"
                                        >
                                            {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5 group-hover:scale-110 transition-transform" />}
                                        </button>
                                    </>
                                )}
                            </div>
                        </aside>

                        {/* Article Text Content */}
                        <div className="flex-1 max-w-[700px]">
                            <article className={cn(
                                "prose prose-slate max-w-none text-slate-800",
                                // Beautiful crisp typography rules
                                fontSizeLevel === 0 ? "prose-p:text-base prose-headings:text-2xl prose-p:leading-[1.7]" :
                                fontSizeLevel === 1 ? "prose-p:text-[19px] prose-p:leading-[1.85] prose-headings:text-3xl" :
                                "prose-p:text-[22px] prose-p:leading-[1.9] prose-headings:text-4xl",
                                "prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-900 prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline prose-strong:font-bold prose-strong:text-slate-900"
                            )}>
                                {article.content.split('\n\n').map((paragraph, idx) => {
                                    if (paragraph.startsWith('# ')) return <h1 key={idx} className="mt-14 mb-8 font-serif">{paragraph.replace('# ', '')}</h1>;
                                    if (paragraph.startsWith('## ')) return <h2 key={idx} className="mt-12 mb-6">{paragraph.replace('## ', '')}</h2>;
                                    if (paragraph.startsWith('### ')) return <h3 key={idx} className="mt-10 mb-4">{paragraph.replace('### ', '')}</h3>;
                                    
                                    if (paragraph.trim().startsWith('- ')) {
                                        return (
                                            <ul key={idx} className="my-8 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                                                {paragraph.split('\n').map((item, i) => {
                                                    if(!item.trim()) return null;
                                                    return (
                                                        <li key={i} className="flex gap-4 items-start mb-3 last:mb-0">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-[11px] shrink-0" />
                                                            <span className="text-slate-700">{item.replace('- ', '')}</span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        );
                                    }

                                    return <p key={idx} className="mb-8 whitespace-pre-line text-slate-700 font-normal">{paragraph}</p>;
                                })}
                            </article>

                            {/* Divider */}
                            <div className="flex items-center justify-center gap-2 my-16 opacity-30">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                            </div>

                            {/* Author Bio Box */}
                            <div className="bg-slate-50 rounded-3xl p-8 flex flex-col md:flex-row gap-8 items-center md:items-start border border-slate-100 group transition-colors hover:bg-slate-100/50 hover:border-slate-200">
                                <Avatar className="h-[100px] w-[100px] shadow-sm border-2 border-white transition-transform group-hover:scale-105 duration-500">
                                    <AvatarImage src={article.author?.avatar_url || undefined} className="object-cover" />
                                    <AvatarFallback className="text-3xl font-black bg-emerald-100 text-emerald-700">
                                        {article.author?.full_name?.[0]?.toUpperCase() || "Y"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="text-center md:text-left">
                                    <h3 className="text-[22px] font-black text-slate-900 mb-1">
                                        {article.author?.full_name}
                                    </h3>
                                    <p className="text-emerald-600 font-bold text-[13px] tracking-wide uppercase mb-4">
                                        {article.author?.special_note || "Onaylı Uzman"}
                                    </p>
                                    <p className="text-slate-600 text-[15px] leading-relaxed">
                                        Karmaşık gelişimsel kavramları aileler için erişilebilir kılma konusunda tutkulu. Çocuğunuzla daha güçlü ve dayanıklı bir bağ kurmanıza yardımcı olmak için bilgi ve deneyimlerini paylaşıyor.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Back to top button */}
                <button 
                    onClick={() => window.scrollTo(0,0)}
                    className={cn(
                        "fixed bottom-8 right-8 w-14 h-14 bg-gray-900 text-white rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 z-50 hover:bg-[#4ade80] hover:-translate-y-2",
                        showScrollTop ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-50 translate-y-10 pointer-events-none"
                    )}
                >
                    <ArrowUp className="h-6 w-6" />
                </button>
            </article>
        </AppShell>
    );
}
