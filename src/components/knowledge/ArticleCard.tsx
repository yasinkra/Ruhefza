import Link from "next/link";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpen, Trash2, Loader2, Bookmark, Share2, Clock, Puzzle, Brain, Activity, MessageCircle, Scale } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { ArticleShareModal } from "@/components/knowledge/ArticleShareModal";
import { cn } from "@/utils/cn";

export interface Article {
    id: string;
    title: string;
    summary: string;
    category: string;
    created_at: string;
    author_id: string;
    author: {
        full_name: string;
        avatar_url: string | null;
    } | null;
}

export function ArticleCard({
    article,
    currentUserId,
    isAdmin,
    onDelete,
    isBookmarked: initialBookmarked = false,
}: {
    article: Article;
    currentUserId?: string | null;
    isAdmin?: boolean;
    onDelete?: (id: string) => void;
    isBookmarked?: boolean;
}) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [bookmarked, setBookmarked] = useState(initialBookmarked);
    const [bookmarkLoading, setBookmarkLoading] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Bu makaleyi silmek istediğinize emin misiniz?")) return;
        setIsDeleting(true);
        try {
            const { error } = await createClient().from('articles').delete().eq('id', article.id);
            if (error) throw error;
            toast.success("Makale başarıyla silindi");
            if (onDelete) onDelete(article.id);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            toast.error("Silinirken bir hata oluştu: " + (error.message || "Bilinmeyen hata"));
        } finally {
            setIsDeleting(false);
        }
    };

    const handleBookmark = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentUserId) { toast.error("Lütfen giriş yapın."); return; }
        setBookmarkLoading(true);
        if (bookmarked) {
            await createClient().from("bookmarks")
                .delete()
                .eq("user_id", currentUserId)
                .eq("item_id", article.id)
                .eq("item_type", "article");
            setBookmarked(false);
            toast.success("Kaydedilenlerden kaldırıldı.");
        } else {
            await createClient().from("bookmarks").insert({
                user_id: currentUserId,
                item_type: "article",
                item_id: article.id,
            });
            setBookmarked(true);
            toast.success("Makale kaydedildi!");
        }
        setBookmarkLoading(false);
    };

    const isAuthor = currentUserId === article.author_id;

    const getCategoryStyles = (category: string) => {
        switch (category) {
            case "Otizm": return { gradient: "from-blue-500 to-cyan-500", icon: <Puzzle className="h-12 w-12 text-white/50 mix-blend-overlay" /> };
            case "DEHB": return { gradient: "from-purple-500 to-fuchsia-500", icon: <Brain className="h-12 w-12 text-white/50 mix-blend-overlay" /> };
            case "Fiziksel Gelişim": return { gradient: "from-emerald-500 to-teal-500", icon: <Activity className="h-12 w-12 text-white/50 mix-blend-overlay" /> };
            case "Dil ve Konuşma": return { gradient: "from-amber-400 to-orange-500", icon: <MessageCircle className="h-12 w-12 text-white/50 mix-blend-overlay" /> };
            case "Yasal Haklar": return { gradient: "from-rose-400 to-red-500", icon: <Scale className="h-12 w-12 text-white/50 mix-blend-overlay" /> };
            default: return { gradient: "from-stone-400 to-stone-300", icon: <BookOpen className="h-12 w-12 text-white/50 mix-blend-overlay" /> };
        }
    };

    const categoryStyle = getCategoryStyles(article.category);

    // Fake calculated read time
    const readTime = Math.max(2, Math.floor(article.summary.length / 50));

    return (
        <>
            <Card className="flex flex-col h-full hover:shadow-xl hover:shadow-stone-200/50 transition-all duration-300 bg-white border-stone-100 overflow-hidden group rounded-[24px]">
                {/* Cover Image Area */}
                <div className={cn("h-32 w-full bg-gradient-to-br flex items-center justify-center relative overflow-hidden transition-transform duration-500 group-hover:scale-105", categoryStyle.gradient)}>
                    <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
                    {categoryStyle.icon}
                    <div className="absolute bottom-3 right-3 bg-black/30 backdrop-blur-md rounded-full px-2.5 py-1 flex items-center gap-1.5 text-white">
                        <Clock className="h-3 w-3" />
                        <span className="text-[10px] font-medium">{readTime} dk okuma</span>
                    </div>
                </div>

                <CardHeader className="pb-3 relative pt-4">
                    <div className="flex justify-between items-start gap-4 mb-3">
                        <Badge variant="outline" className="bg-stone-100 text-stone-700 border-transparent font-semibold shadow-sm rounded-full px-3 py-1">
                            {article.category}
                        </Badge>
                        <div className="flex items-center gap-1 -mt-1 -mr-2 bg-white/80 backdrop-blur-sm rounded-full px-1 py-1 shadow-sm border border-stone-100">
                            {(isAuthor || isAdmin) && (
                                <Button variant="ghost" size="icon"
                                    className="h-8 w-8 text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                    onClick={handleDelete} disabled={isDeleting}>
                                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                            )}
                            {currentUserId && (
                                <>
                                    <Button variant="ghost" size="icon"
                                        className="h-8 w-8 transition-colors"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowShareModal(true); }}
                                        title="Arkadaşına gönder">
                                        <Share2 className="h-4 w-4 text-stone-400 hover:text-teal-500" />
                                    </Button>
                                    <Button variant="ghost" size="icon"
                                        className="h-8 w-8 transition-colors"
                                        onClick={handleBookmark}
                                        disabled={bookmarkLoading}
                                        title={bookmarked ? "Kaydedilenlerden kaldır" : "Kaydet"}>
                                        <Bookmark className={bookmarkLoading ? "h-4 w-4 opacity-50" : bookmarked ? "h-4 w-4 fill-teal-500 text-teal-500" : "h-4 w-4 text-stone-400 hover:text-teal-500"} />
                                    </Button>
                                </>
                            )}
                            <BookOpen className="h-5 w-5 text-stone-300 group-hover:text-teal-500 transition-colors" />
                        </div>
                    </div>
                    <CardTitle className="text-xl sm:text-2xl font-bold leading-tight text-stone-900 group-hover:text-teal-700 transition-colors line-clamp-2">
                        {article.title}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pb-4">
                    <p className="text-stone-500 text-sm line-clamp-3 leading-relaxed font-medium">{article.summary}</p>
                </CardContent>
                <CardFooter className="pt-4 pb-4 px-6 border-t border-stone-50 bg-stone-50/50 flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={article.author?.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">{article.author?.full_name?.[0]?.toUpperCase() || "Y"}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-stone-900 line-clamp-1 max-w-[100px]">
                                {article.author?.full_name || "Yazar"}
                            </span>
                            <span className="text-[10px] text-stone-400">
                                {formatDistanceToNow(new Date(article.created_at), { addSuffix: true, locale: tr })}
                            </span>
                        </div>
                    </div>
                    <Link href={`/knowledge/${article.id}`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white border border-stone-200 text-stone-400 group-hover:bg-teal-500 group-hover:text-white group-hover:border-teal-500 transition-all shadow-sm">
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </CardFooter>
            </Card>

            {showShareModal && currentUserId && (
                <ArticleShareModal
                    article={article}
                    currentUserId={currentUserId}
                    onClose={() => setShowShareModal(false)}
                />
            )}
        </>
    );
}
