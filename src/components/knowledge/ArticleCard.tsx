import Link from "next/link";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpen, Trash2, Loader2, Bookmark, Share2, Clock, Puzzle, Brain, Activity, MessageCircle, Scale, BadgeCheck, ThumbsUp } from "lucide-react";
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
    image_url?: string | null;
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
    isLiked: initialLiked = false,
}: {
    article: Article;
    currentUserId?: string | null;
    isAdmin?: boolean;
    onDelete?: (id: string) => void;
    isBookmarked?: boolean;
    isLiked?: boolean;
}) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [bookmarked, setBookmarked] = useState(initialBookmarked);
    const [liked, setLiked] = useState(initialLiked);
    const [bookmarkLoading, setBookmarkLoading] = useState(false);
    const [likeLoading, setLikeLoading] = useState(false);
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
        try {
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
        } catch (error) {
            console.error("Error toggling bookmark:", error);
            toast.error("İşlem yapılırken bir hata oluştu.");
        } finally {
            setBookmarkLoading(false);
        }
    };

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentUserId) { toast.error("Lütfen giriş yapın."); return; }
        setLikeLoading(true);
        try {
            if (liked) {
                await createClient().from("article_likes")
                    .delete()
                    .eq("user_id", currentUserId)
                    .eq("article_id", article.id);
                setLiked(false);
                toast.success("Beğeni kaldırıldı.");
            } else {
                await createClient().from("article_likes").insert({
                    user_id: currentUserId,
                    article_id: article.id,
                });
                setLiked(true);
                toast.success("Makale beğenildi!");
            }
        } catch (error) {
            console.error("Error toggling like:", error);
            toast.error("İşlem yapılırken bir hata oluştu.");
        } finally {
            setLikeLoading(false);
        }
    };

    const isAuthor = currentUserId === article.author_id;

    const getCategoryStyles = (category: string) => {
        switch (category) {
            case "Otizm": return { 
                tagColor: "text-[#4ade80]", // Greenish
                image: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" // blocks
            };
            case "DEHB": return { 
                tagColor: "text-[#fb923c]", // Orange
                image: "https://images.unsplash.com/photo-1506784926709-22f1ec395907?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" // clock
            };
            case "Fiziksel Gelişim": return { 
                tagColor: "text-[#38bdf8]", // Blue
                image: "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" // physical activity
            };
            case "Dil ve Konuşma": return { 
                tagColor: "text-[#60a5fa]", // Light blue
                image: "https://images.unsplash.com/photo-1577563908411-5079b6a66011?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" // chat bubbles/communication
            };
            case "Yasal Haklar": return { 
                tagColor: "text-[#f43f5e]", // Rose
                image: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" // scales
            };
            default: return { 
                tagColor: "text-[#0c9789]", // Teal
                image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" // study/books
            };
        }
    };

    const categoryStyle = getCategoryStyles(article.category);

    // Fake calculated read time
    const readTime = Math.max(2, Math.floor(article.summary.length / 50));

    return (
        <>
            <Card className="flex flex-col h-full hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all duration-300 bg-white border-transparent overflow-hidden group rounded-[32px] cursor-pointer">
                {/* Cover Image Area */}
                <div className="h-44 w-full relative bg-gray-100 overflow-hidden shrink-0">
                    {/* Background Image */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={categoryStyle.image} alt={article.category} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    
                    {/* Overlay Buttons */}
                    <div className="absolute top-4 right-4 flex gap-2">
                        {currentUserId && (
                            <>
                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleBookmark(e); }}
                                    disabled={bookmarkLoading}
                                    className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform text-[#fb923c]"
                                    title={bookmarked ? "Kaydedilenlerden kaldır" : "Kaydet"}
                                >
                                    <Bookmark className={cn("h-4 w-4", bookmarked && "fill-[#fb923c]")} />
                                </button>
                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowShareModal(true); }}
                                    className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform text-[#60a5fa]"
                                    title="Arkadaşına gönder"
                                >
                                    <Share2 className="h-4 w-4" />
                                </button>
                            </>
                        )}
                        {isAuthor && (
                            <button
                                onClick={handleDelete} disabled={isDeleting}
                                className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:scale-110 transition-transform text-red-500"
                                title="Makaleyi sil"
                            >
                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </button>
                        )}
                    </div>

                    {/* Category Tag (Floating on bottom left of cover) */}
                    <div className="absolute -bottom-3 left-6 z-10 hidden group-hover:block transition-all duration-300">
                        {/* Empty space for hover effect if needed, but we keep the pill stationary in normal design */}
                    </div>
                </div>

                <div className="relative -mt-3 ml-6 z-10 w-fit">
                    <div className="bg-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest shadow-[0_2px_10px_rgb(0,0,0,0.06)] uppercase">
                        <span className={categoryStyle.tagColor}>{article.category}</span>
                    </div>
                </div>

                <Link href={`/knowledge/${article.id}`} className="flex-1 flex flex-col">
                    <CardHeader className="pb-2 pt-4 px-6 flex-none">
                        <CardTitle className="text-[17px] sm:text-[19px] font-bold leading-snug text-gray-900 group-hover:text-[#0c9789] transition-colors line-clamp-2">
                            {article.title}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 pb-4 px-6">
                        <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed font-medium">
                            {article.summary}
                        </p>
                    </CardContent>
                </Link>
                
                <CardFooter className="pt-4 pb-6 px-6 bg-white flex items-center justify-between border-t border-gray-50">
                    <div className="flex items-center gap-3">
                        <Link href={`/profile/${article.author_id}`} onClick={(e) => e.stopPropagation()}>
                            <Avatar className="h-9 w-9 ring-2 ring-gray-50 shadow-sm cursor-pointer hover:ring-[#0c9789]/50 transition-all">
                                <AvatarImage src={article.author?.avatar_url || undefined} />
                                <AvatarFallback className="text-xs bg-[#f0fdfa] text-[#0c9789] font-bold">
                                    {article.author?.full_name?.[0]?.toUpperCase() || "Y"}
                                </AvatarFallback>
                            </Avatar>
                        </Link>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                                <Link href={`/profile/${article.author_id}`} onClick={(e) => e.stopPropagation()} className="text-[14px] font-bold text-gray-900 line-clamp-1 hover:text-[#0c9789] transition-colors cursor-pointer">
                                    {article.author?.full_name || "Yazar"}
                                </Link>
                                <BadgeCheck className="h-4 w-4 text-blue-500" />
                            </div>
                            <span className="text-[12px] font-semibold text-gray-400">
                                {readTime} dk okuma
                            </span>
                        </div>
                    </div>

                    {currentUserId && (
                        <button
                            onClick={handleLike}
                            disabled={likeLoading}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 z-10",
                                liked 
                                    ? "bg-red-50 text-red-500 font-bold shadow-sm" 
                                    : "bg-gray-50 text-gray-400 hover:bg-gray-100 font-medium"
                            )}
                            title={liked ? "Beğendiniz" : "Beğen"}
                        >
                            <ThumbsUp className={cn("h-4 w-4", liked && "fill-red-500")} />
                            <span className="text-[12px]">{liked ? "Beğenildi" : "Beğen"}</span>
                        </button>
                    )}
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
