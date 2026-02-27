"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Heart, Ghost, Send, BadgeCheck, Tag, Bookmark, Trash2, Loader2 } from "lucide-react";
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
    processedStr = processedStr.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-sky-500 hover:text-sky-600 hover:underline break-words">$1</a>');

    // Bold (**text**)
    processedStr = processedStr.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic (*text*)
    processedStr = processedStr.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

    // Wrap in standard formatting
    return <p className="text-slate-700 whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: processedStr }} />;
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

    return (
        <Card className="overflow-hidden bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center gap-4 p-4 pb-2">
                {post.is_anonymous ? (
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-500">
                        <Ghost className="h-5 w-5" />
                    </div>
                ) : (
                    <Avatar>
                        <AvatarImage src={post.profiles?.avatar_url || undefined} />
                        <AvatarFallback>{post.profiles?.full_name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                )}
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 inline-flex items-center gap-1">
                            {post.is_anonymous ? "Anonim Üye" : post.profiles?.full_name || "İsimsiz Kullanıcı"}
                            {post.profiles?.is_verified_expert && !post.is_anonymous && (
                                <BadgeCheck className="h-4 w-4 text-sky-500" aria-label="Doğrulanmış Uzman" />
                            )}
                        </span>
                        {!post.is_anonymous && post.profiles?.role && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-tighter border border-slate-200">
                                {post.profiles.role === 'teacher' ? 'Uzman Öğretmen' : (post.profiles.role === 'student' ? 'Öğrenci' : 'Ebeveyn')}
                            </span>
                        )}
                    </div>
                    <span className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: tr })}
                    </span>
                </div>
                {post.category && (
                    <Badge variant="secondary" className="ml-auto bg-slate-100 text-slate-600 font-medium font-mono text-[10px] hidden sm:flex">
                        <Tag className="w-3 h-3 mr-1" />
                        {post.category}
                    </Badge>
                )}
                {(currentUserId === post.author_id || isAdmin) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn("text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 h-auto ml-1", !post.category && "ml-auto")}
                        onClick={handleDelete}
                        title="Gönderiyi Sil"
                        disabled={isDeleting}
                    >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </Button>
                )}
            </CardHeader>
            <CardContent className="p-4 pt-1">
                {renderContent(post.content)}
                {post.image_url && (
                    <div className="mt-4 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 relative">
                        {/* Using standard img for external blob urls, standard practice for user uploaded media avoiding Next.js domain configs */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={post.image_url}
                            alt="Post Attachment"
                            className="w-full h-auto max-h-[500px] object-contain"
                            loading="lazy"
                        />
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex-col items-stretch p-0 bg-slate-50/50 border-t border-slate-50">
                <div className="flex items-center justify-between p-4 py-2">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "gap-2 transition-colors",
                                hasLiked ? "text-red-500 hover:text-red-600 hover:bg-red-50" : "text-slate-500 hover:text-red-500 hover:bg-red-50"
                            )}
                            onClick={handleLike}
                        >
                            <Heart className={cn("h-4 w-4", hasLiked && "fill-current")} />
                            <span className="text-xs">{likesCount > 0 ? likesCount : "Beğen"}</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "text-slate-500 gap-2 transition-colors",
                                showComments ? "text-sky-600 bg-sky-50" : "hover:text-sky-600 hover:bg-sky-50"
                            )}
                            onClick={() => setShowComments(!showComments)}
                        >
                            <MessageCircle className="h-4 w-4" />
                            <span className="text-xs">Yorumlar {post.comments_count ? `(${post.comments_count})` : ''}</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "text-slate-500 gap-2 transition-colors",
                                hasBookmarked ? "text-amber-500 bg-amber-50" : "hover:text-amber-500 hover:bg-amber-50"
                            )}
                            onClick={handleBookmark}
                        >
                            <Bookmark className={cn("h-4 w-4", hasBookmarked && "fill-current")} />
                            <span className="text-xs hidden sm:inline">{hasBookmarked ? "Kaydedildi" : "Kaydet"}</span>
                        </Button>
                    </div>

                    {showMessageButton && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-500 hover:text-sky-600 hover:bg-sky-50 gap-2 transition-colors"
                            onClick={handleMessage}
                        >
                            <Send className="h-4 w-4" />
                            <span className="text-xs">Mesaj</span>
                        </Button>
                    )}
                </div>

                {showComments && (
                    <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                        <CommentSection
                            postId={post.id}
                            postAuthorId={post.author_id}
                            isQuestion={post.category === "Soru"}
                        />
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}
