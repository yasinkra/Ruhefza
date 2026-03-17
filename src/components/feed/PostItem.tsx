"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    processedStr = processedStr.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-[#0c9789] hover:text-[#0a7c70] hover:underline break-words">$1</a>');

    // Bold (**text**)
    processedStr = processedStr.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic (*text*)
    processedStr = processedStr.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

    // Wrap in standard formatting
    return <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm" dangerouslySetInnerHTML={{ __html: processedStr }} />;
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
    const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
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
        <article className="overflow-hidden bg-white rounded-[2.5rem] border border-gray-100/80 shadow-[0_2px_15px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 mb-6 group">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 sm:p-6 pb-2 sm:pb-4 gap-4">
                <div className="flex items-center gap-3">
                    {post.is_anonymous ? (
                        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-400 shrink-0">
                            <Ghost className="h-6 w-6" />
                        </div>
                    ) : (
                        <Link href={`/profile/${post.author_id}`} onClick={(e) => e.stopPropagation()}>
                            <Avatar className="h-12 w-12 shrink-0 border border-gray-100 shadow-sm cursor-pointer hover:ring-2 hover:ring-[#0c9789]/50 transition-all">
                                <AvatarImage src={post.profiles?.avatar_url || undefined} />
                                <AvatarFallback className="bg-gradient-to-br from-[#0c9789] to-[#14b8a6] text-white font-bold">
                                    {post.profiles?.full_name?.[0]?.toUpperCase() || "U"}
                                </AvatarFallback>
                            </Avatar>
                        </Link>
                    )}
                    <div className="flex flex-col min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            {post.is_anonymous ? (
                                <span className="font-bold text-gray-800 text-[15px] truncate inline-flex items-center gap-1">
                                    Anonim Üye
                                </span>
                            ) : (
                                <Link href={`/profile/${post.author_id}`} onClick={(e) => e.stopPropagation()} className="font-bold text-gray-800 hover:text-[#0c9789] transition-colors text-[15px] truncate inline-flex items-center gap-1 cursor-pointer">
                                    {post.profiles?.full_name || "İsimsiz Kullanıcı"}
                                    {post.profiles?.is_verified_expert && (
                                        <span className="flex items-center gap-1.5 bg-[#0c9789] text-white text-[9px] font-black px-2.5 py-1 rounded-full shadow-sm uppercase ml-1.5 translate-y-[1px]">
                                            <BadgeCheck className="h-3 w-3 fill-white text-[#0c9789]" /> Doğrulanmış Uzman
                                        </span>
                                    )}
                                </Link>
                            )}
                        </div>
                        <p className="text-gray-500 text-xs mt-1">
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
                        <span className="bg-[#f0fdfa] text-[#0c9789] px-4 py-1.5 rounded-full text-[11px] font-bold uppercase hidden sm:inline-block border border-[#0c9789]">
                            {post.category}
                        </span>
                    )}
                    <button className="p-2 text-gray-400 hover:text-[#0c9789] hover:bg-gray-50 rounded-xl transition-all"><MoreHorizontal className="w-5 h-5" /></button>
                </div>
            </div>

            <div className="p-5 sm:p-6 pt-0">
                <div className={cn("relative text-[15px] sm:text-base text-gray-700 leading-relaxed", !isExpanded && "line-clamp-3")}>
                    {renderContent(post.content)}
                </div>
                {post.content.length > 200 && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className="text-[#0c9789] hover:text-[#0a7c70] text-sm font-bold mt-3 focus:outline-none"
                    >
                        {isExpanded ? "Daha az göster" : "Devamını oku..."}
                    </button>
                )}

                {post.category && (
                    <div className="flex gap-2 mb-2 sm:hidden mt-4">
                        <span className="bg-[#0c9789]/10 text-[#0c9789] px-3 py-1 rounded-full text-[10px] font-bold uppercase border border-[#0c9789]/20">
                            {post.category}
                        </span>
                    </div>
                )}

                {post.image_url && (
                    <div className="mt-4 rounded-xl overflow-hidden border border-[#14b8a6]/20 relative aspect-auto max-h-[500px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={post.image_url} alt="Görsel" className="w-full h-full object-contain" loading="lazy" />
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between p-6 pt-2">
                <div className="flex gap-6">
                    <button
                        className={cn("flex items-center gap-2 transition-colors", hasLiked ? "text-[#0c9789]" : "text-gray-400 hover:text-[#0c9789]")}
                        onClick={handleLike}
                    >
                        <Heart className={cn("w-5 h-5", hasLiked && "fill-current")} />
                        <span className="text-sm font-bold">{likesCount}</span>
                    </button>
                    <button
                        className={cn("flex items-center gap-2 transition-colors", showComments ? "text-[#0c9789]" : "text-gray-400 hover:text-[#0c9789]")}
                        onClick={() => setShowComments(!showComments)}
                    >
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-sm font-bold">{commentsCount}</span>
                    </button>
                    <button
                        className="flex items-center gap-2 text-gray-400 hover:text-[#0c9789] transition-colors"
                        onClick={handleShare}
                    >
                        <Share2 className="w-5 h-5" />
                        <span className="text-sm font-bold hidden sm:inline">Paylaş</span>
                    </button>
                </div>
                <div className="flex gap-3 items-center">
                    {(currentUserId === post.author_id || isAdmin) && (
                        <button
                            className="p-2 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-xl transition-all"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                        </button>
                    )}
                    <button
                        className={cn("p-2 rounded-xl transition-all", hasBookmarked ? "text-amber-400 bg-amber-50" : "text-gray-300 hover:text-[#0c9789] hover:bg-gray-50")}
                        onClick={handleBookmark}
                    >
                        <Bookmark className={cn("w-5 h-5", hasBookmarked && "fill-current")} />
                    </button>
                    {showMessageButton && (
                        <button className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-[#0c9789] text-white rounded-2xl hover:bg-[#4a6f5a] transition-all font-bold text-xs shadow-sm shadow-[#0c9789]/20" onClick={handleMessage}>
                            <Send className="w-4 h-4" /> Mesaj
                        </button>
                    )}
                </div>
            </div>

            {showComments && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200 bg-[#f0fdfa]/50">
                    <CommentSection
                        postId={post.id}
                        postAuthorId={post.author_id}
                        isQuestion={post.category === "Soru"}
                        onCommentAdded={() => setCommentsCount(prev => prev + 1)}
                        onCommentDeleted={() => setCommentsCount(prev => Math.max(0, prev - 1))}
                    />
                </div>
            )}
        </article>
    );
}
