"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Heart, Ghost, Send, BadgeCheck, Tag, Bookmark, Trash2, Loader2, Share2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";
import { CommentSection } from "./CommentSection";

interface Post {
    id: string;
    content: string;
    is_anonymous: boolean;
    likes_count: number;
    comments_count?: number;
    created_at: string;
    category?: string;
    image_url?: string | null;
    user_has_liked?: boolean;
    user_has_bookmarked?: boolean;
    author_id: string;
    profiles: {
        full_name: string;
        avatar_url: string | null;
        is_verified_expert?: boolean;
        role?: string;
    } | null;
}

// Custom Markdown & Link Parser for secure and lightweight rendering
const renderContent = (text: string) => {
    // Escape HTML to prevent XSS
    const escapeHtml = (unsafe: string) => {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    let processedStr = escapeHtml(text);

    // Convert URLs to clickable links
    const urlPattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/ig;
    processedStr = processedStr.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-[#7b9e89] hover:text-[#6ba88f] hover:underline break-words">$1</a>');

    // Bold (**text**)
    processedStr = processedStr.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic (*text*)
    processedStr = processedStr.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

    // Wrap in standard formatting
    return <p className="text-stone-700 whitespace-pre-wrap leading-relaxed text-sm" dangerouslySetInnerHTML={{ __html: processedStr }} />;
};

interface PostItemProps {
    post: Post;
    currentUserId: string | null;
    isAdmin?: boolean;
    onDelete?: (id: string) => void;
}

export function PostItem({ post, currentUserId, isAdmin, onDelete }: PostItemProps) {
    const router = useRouter();
    const [likesCount, setLikesCount] = useState(post.likes_count);
    const [hasLiked, setHasLiked] = useState(post.user_has_liked || false);
    const [hasBookmarked, setHasBookmarked] = useState(post.user_has_bookmarked || false);
    const [showComments, setShowComments] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm("Bu gönderiyi silmek istediğinize emin misiniz?")) return;
        setIsDeleting(true);
        try {
            const { error } = await createClient().from('posts').delete().eq('id', post.id);
            if (error) throw error;
            if (onDelete) onDelete(post.id);
        } catch (error) {
            console.error("Error deleting post:", error);
            alert("Silinirken hata oluştu.");
            setIsDeleting(false);
        }
    };

    const handleLike = async () => {
        if (!currentUserId) {
            alert("Beğenmek için giriş yapmalısınız.");
            return;
        }

        // Optimistic update
        const newLikeStatus = !hasLiked;
        setHasLiked(newLikeStatus);
        setLikesCount(prev => newLikeStatus ? prev + 1 : prev - 1);

        try {
            if (newLikeStatus) {
                await createClient().from("post_likes").insert({ user_id: currentUserId, post_id: post.id });
            } else {
                await createClient().from("post_likes").delete().match({ user_id: currentUserId, post_id: post.id });
            }
        } catch (error) {
            console.error("Error toggling like:", error);
            // Revert on error
            setHasLiked(!newLikeStatus);
            setLikesCount(prev => !newLikeStatus ? prev + 1 : prev - 1);
        }
    };

    const handleBookmark = async () => {
        if (!currentUserId) {
            alert("Kaydetmek için giriş yapmalısınız.");
            return;
        }

        // Optimistic update
        const newBookmarkStatus = !hasBookmarked;
        setHasBookmarked(newBookmarkStatus);

        try {
            if (newBookmarkStatus) {
                await createClient().from("bookmarks").insert({ user_id: currentUserId, item_type: "post", item_id: post.id });
            } else {
                await createClient().from("bookmarks").delete().match({ user_id: currentUserId, item_type: "post", item_id: post.id });
            }
        } catch (error) {
            console.error("Error toggling bookmark:", error);
            // Revert on error
            setHasBookmarked(!newBookmarkStatus);
        }
    };

    const handleMessage = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click if any
        if (!currentUserId) {
            alert("Mesaj göndermek için giriş yapmalısınız.");
            return;
        }
        router.push(`/messages?userId=${post.author_id}`);
    };

    const showMessageButton = !post.is_anonymous && currentUserId && currentUserId !== post.author_id;

    const [isExpanded, setIsExpanded] = useState(false);

    const handleShare = async () => {
        try {
            await navigator.share({
                title: "RuhefzaApp Gönderisi",
                text: "Bu gönderiye göz at:",
                url: window.location.origin + `/feed?post=${post.id}`
            });
        } catch (e) {
            navigator.clipboard.writeText(window.location.origin + `/feed?post=${post.id}`);
            alert("Bağlantı kopyalandı!");
        }
    };

    return (
        <article className="overflow-hidden bg-white rounded-[2rem] border border-stone-100 hover:shadow-md transition-all duration-300 mb-8 group">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 sm:p-6 pb-2 sm:pb-4 gap-4">
                <div className="flex items-center gap-3">
                    {post.is_anonymous ? (
                        <div className="h-12 w-12 rounded-full bg-stone-100 flex items-center justify-center border border-stone-200 text-stone-400 shrink-0">
                            <Ghost className="h-6 w-6" />
                        </div>
                    ) : (
                        <Avatar className="h-12 w-12 shrink-0 border border-stone-100 shadow-sm">
                            <AvatarImage src={post.profiles?.avatar_url || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-[#7b9e89] to-[#a2c1b1] text-white font-bold">
                                {post.profiles?.full_name?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                        </Avatar>
                    )}
                    <div className="flex flex-col min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-stone-800 text-[15px] truncate inline-flex items-center gap-1">
                                {post.is_anonymous ? "Anonim Üye" : post.profiles?.full_name || "İsimsiz Kullanıcı"}
                                {post.profiles?.is_verified_expert && !post.is_anonymous && (
                                    <span className="flex items-center gap-1 bg-[#7b9e89]/10 text-[#7b9e89] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#7b9e89]/20 uppercase ml-1">
                                        <BadgeCheck className="h-3 w-3" /> Doğrulanmış Uzman
                                    </span>
                                )}
                            </span>
                        </div>
                        <p className="text-stone-500 text-xs mt-1">
                            {!post.is_anonymous && post.profiles?.role && (
                                <span className="mr-1">
                                    {post.profiles.role === 'teacher' ? 'Uzman' : (post.profiles.role === 'student' ? 'Öğrenci' : 'Ebeveyn')} •
                                </span>
                            )}
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: tr })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 ml-auto sm:ml-0">
                    {post.category && (
                        <span className="bg-[#f1f7f4] text-[#5c8a70] px-4 py-1.5 rounded-full text-[11px] font-bold uppercase hidden sm:inline-block border border-[#dbe5e0]">
                            {post.category}
                        </span>
                    )}
                    <button className="p-2 text-stone-400 hover:text-[#5c8a70] hover:bg-stone-50 rounded-xl transition-all"><MoreHorizontal className="w-5 h-5" /></button>
                </div>
            </div>

            <div className="p-5 sm:p-6 pt-0">
                <div className={cn("relative text-[15px] sm:text-base text-stone-700 leading-relaxed", !isExpanded && "line-clamp-3")}>
                    {renderContent(post.content)}
                </div>
                {post.content.length > 200 && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className="text-[#7b9e89] hover:text-[#6ba88f] text-sm font-bold mt-3 focus:outline-none"
                    >
                        {isExpanded ? "Daha az göster" : "Devamını oku..."}
                    </button>
                )}

                {post.category && (
                    <div className="flex gap-2 mb-2 sm:hidden mt-4">
                        <span className="bg-[#b388c6]/10 text-[#b388c6] px-3 py-1 rounded-full text-[10px] font-bold uppercase border border-[#b388c6]/20">
                            {post.category}
                        </span>
                    </div>
                )}

                {post.image_url && (
                    <div className="mt-4 rounded-xl overflow-hidden border border-[#a2c1b1]/20 relative aspect-auto max-h-[500px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={post.image_url} alt="Görsel" className="w-full h-full object-contain" loading="lazy" />
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between p-6 pt-2">
                <div className="flex gap-6">
                    <button
                        className={cn("flex items-center gap-2 transition-colors", hasLiked ? "text-[#f2a68d]" : "text-stone-400 hover:text-[#5c8a70]")}
                        onClick={handleLike}
                    >
                        <Heart className={cn("w-5 h-5", hasLiked && "fill-current")} />
                        <span className="text-sm font-bold">{likesCount}</span>
                    </button>
                    <button
                        className={cn("flex items-center gap-2 transition-colors", showComments ? "text-[#5c8a70]" : "text-stone-400 hover:text-[#5c8a70]")}
                        onClick={() => setShowComments(!showComments)}
                    >
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-sm font-bold">{post.comments_count || 0}</span>
                    </button>
                    <button
                        className="flex items-center gap-2 text-stone-400 hover:text-[#5c8a70] transition-colors"
                        onClick={handleShare}
                    >
                        <Share2 className="w-5 h-5" />
                        <span className="text-sm font-bold hidden sm:inline">Paylaş</span>
                    </button>
                </div>
                <div className="flex gap-3 items-center">
                    {(currentUserId === post.author_id || isAdmin) && (
                        <button
                            className="p-2 text-stone-300 hover:text-red-400 hover:bg-red-50 rounded-xl transition-all"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                        </button>
                    )}
                    <button
                        className={cn("p-2 rounded-xl transition-all", hasBookmarked ? "text-amber-400 bg-amber-50" : "text-stone-300 hover:text-[#5c8a70] hover:bg-stone-50")}
                        onClick={handleBookmark}
                    >
                        <Bookmark className={cn("w-5 h-5", hasBookmarked && "fill-current")} />
                    </button>
                    {showMessageButton && (
                        <button className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-[#5c8a70] text-white rounded-2xl hover:bg-[#4a6f5a] transition-all font-bold text-xs shadow-sm shadow-[#5c8a70]/20" onClick={handleMessage}>
                            <Send className="w-4 h-4" /> Mesaj
                        </button>
                    )}
                </div>
            </div>

            {showComments && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200 bg-[#f8fcf9]/50">
                    <CommentSection
                        postId={post.id}
                        postAuthorId={post.author_id}
                        isQuestion={post.category === "Soru"}
                    />
                </div>
            )}
        </article>
    );
}
