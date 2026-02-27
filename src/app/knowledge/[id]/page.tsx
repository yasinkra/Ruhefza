"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Bookmark, BookOpen, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
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
                <article className="h-full overflow-y-auto bg-white pb-20 animate-pulse">
                    <div className="bg-slate-50 border-b border-slate-200">
                        <div className="max-w-3xl mx-auto px-4 pt-8 pb-12">
                            <div className="h-4 w-32 bg-slate-200 rounded mb-6"></div>
                            <div className="h-6 w-24 bg-sky-100 rounded-full mb-4"></div>
                            <div className="h-10 w-3/4 bg-slate-200 rounded-lg mb-4"></div>
                            <div className="h-10 w-1/2 bg-slate-200 rounded-lg mb-6"></div>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-slate-200 rounded-full"></div>
                                <div>
                                    <div className="h-4 w-32 bg-slate-200 rounded mb-2"></div>
                                    <div className="h-3 w-24 bg-slate-200 rounded"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
                        <div className="h-64 md:h-96 w-full bg-slate-100 rounded-xl mb-10"></div>
                        <div className="h-4 w-full bg-slate-100 rounded"></div>
                        <div className="h-4 w-full bg-slate-100 rounded"></div>
                        <div className="h-4 w-4/5 bg-slate-100 rounded"></div>
                        <div className="h-4 w-full bg-slate-100 rounded mt-8"></div>
                        <div className="h-4 w-5/6 bg-slate-100 rounded"></div>
                    </div>
                </article>
            </AppShell>
        );
    }

    if (!article) return (
        <AppShell fullWidth={true}>
            <div className="h-full overflow-y-auto bg-stone-50 flex items-center justify-center px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-stone-200 text-center">
                    <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <BookOpen className="h-8 w-8 text-stone-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Makale Bulunamadı</h1>
                    <p className="text-slate-500 mb-8">Aradığınız makale silinmiş veya taşınmış olabilir.</p>
                    <Link href="/knowledge" className="inline-flex items-center justify-center w-full px-4 py-3 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-xl transition-colors">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Kütüphaneye Dön
                    </Link>
                </div>
            </div>
        </AppShell>
    );

    return (
        <AppShell fullWidth={true}>
            <article className="h-full overflow-y-auto bg-white pb-20">
                {/* Hero / Header */}
                <div className="bg-slate-50 border-b border-slate-200">
                    <div className="max-w-3xl mx-auto px-4 pt-8 pb-12">
                        <Link href="/knowledge" className="inline-flex items-center text-slate-500 hover:text-slate-900 mb-6 transition-colors font-medium text-sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Kütüphaneye Dön
                        </Link>

                        <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-200 border-none mb-4">
                            {article.category}
                        </Badge>

                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
                            {article.title}
                        </h1>

                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border border-white shadow-sm">
                                    <AvatarImage src={article.author?.avatar_url || undefined} />
                                    <AvatarFallback>{article.author?.full_name?.[0]?.toUpperCase() || "Y"}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-semibold text-slate-900">{article.author?.full_name}</div>
                                    <div className="text-xs text-slate-500">
                                        {article.author?.special_note || "Yazar"} • {formatDistanceToNow(new Date(article.created_at), { addSuffix: true, locale: tr })}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {(isAdmin || (currentUserId && currentUserId === article.author_id)) && (
                                    <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={handleDeleteArticle} disabled={isDeleting}>
                                        {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                                    </Button>
                                )}
                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-900">
                                    <Bookmark className="h-5 w-5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-900">
                                    <Share2 className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-3xl mx-auto px-4 py-12">
                    {article.image_url && (
                        <div className="mb-10 rounded-xl overflow-hidden shadow-lg">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={article.image_url}
                                alt={article.title}
                                className="w-full h-auto object-cover max-h-[500px]"
                            />
                        </div>
                    )}

                    <div className="prose prose-lg prose-slate max-w-none">
                        {/* Basic rendering: splitting by double newlines for paragraphs */}
                        {article.content.split('\n\n').map((paragraph, idx) => {
                            // Very basic header detection
                            if (paragraph.startsWith('# ')) return <h1 key={idx}>{paragraph.replace('# ', '')}</h1>;
                            if (paragraph.startsWith('## ')) return <h2 key={idx}>{paragraph.replace('## ', '')}</h2>;
                            if (paragraph.startsWith('### ')) return <h3 key={idx}>{paragraph.replace('### ', '')}</h3>;
                            // List detection
                            if (paragraph.trim().startsWith('- ')) {
                                return (
                                    <ul key={idx}>
                                        {paragraph.split('\n').map((item, i) => (
                                            <li key={i}>{item.replace('- ', '')}</li>
                                        ))}
                                    </ul>
                                );
                            }

                            return <p key={idx} className="mb-6 whitespace-pre-line text-slate-700 leading-8">{paragraph}</p>;
                        })}
                    </div>
                </div>
            </article>
        </AppShell>
    );
}
