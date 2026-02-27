import Link from "next/link";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpen, Trash2, Loader2, Bookmark, Share2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/utils/supabase/client";
import { toast } from "sonner";
import { ArticleShareModal } from "@/components/knowledge/ArticleShareModal";

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
            const { error } = await supabase.from('articles').delete().eq('id', article.id);
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
            await supabase.from("bookmarks")
                .delete()
                .eq("user_id", currentUserId)
                .eq("item_id", article.id)
                .eq("item_type", "article");
            setBookmarked(false);
            toast.success("Kaydedilenlerden kaldırıldı.");
        } else {
            await supabase.from("bookmarks").insert({
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

    return (
        <>
            <Card className="flex flex-col h-full hover:shadow-lg transition-shadow bg-white border-slate-200 overflow-hidden group">
                <CardHeader className="pb-3 relative">
                    <div className="flex justify-between items-start gap-4 mb-2">
                        <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 transition-colors">
                            {article.category}
                        </Badge>
                        <div className="flex items-center gap-1">
                            {(isAuthor || isAdmin) && (
                                <Button variant="ghost" size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
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
                                        <Share2 className="h-4 w-4 text-slate-400 hover:text-sky-500" />
                                    </Button>
                                    <Button variant="ghost" size="icon"
                                        className="h-8 w-8 transition-colors"
                                        onClick={handleBookmark}
                                        disabled={bookmarkLoading}
                                        title={bookmarked ? "Kaydedilenlerden kaldır" : "Kaydet"}>
                                        <Bookmark className={bookmarkLoading ? "h-4 w-4 opacity-50" : bookmarked ? "h-4 w-4 fill-sky-500 text-sky-500" : "h-4 w-4 text-slate-400 hover:text-sky-500"} />
                                    </Button>
                                </>
                            )}
                            <BookOpen className="h-5 w-5 text-slate-300 group-hover:text-sky-500 transition-colors" />
                        </div>
                    </div>
                    <CardTitle className="text-xl leading-tight text-slate-900 group-hover:text-sky-700 transition-colors line-clamp-2">
                        {article.title}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pb-3">
                    <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed">{article.summary}</p>
                </CardContent>
                <CardFooter className="pt-3 border-t border-slate-50 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={article.author?.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">{article.author?.full_name?.[0]?.toUpperCase() || "Y"}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-900 line-clamp-1 max-w-[100px]">
                                {article.author?.full_name || "Yazar"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                                {formatDistanceToNow(new Date(article.created_at), { addSuffix: true, locale: tr })}
                            </span>
                        </div>
                    </div>
                    <Link href={`/knowledge/${article.id}`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 group-hover:bg-sky-500 group-hover:text-white group-hover:border-sky-500 transition-all shadow-sm">
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
