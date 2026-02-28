"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Trash2, BadgeCheck } from "lucide-react";
import { cn } from "@/utils/cn";

interface Comment {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    is_best_answer: boolean;
    profiles: {
        full_name: string;
        avatar_url: string | null;
        is_verified_expert?: boolean;
    };
}

interface CommentSectionProps {
    postId: string;
    postAuthorId: string;
    isQuestion: boolean;
    onCommentAdded?: () => void;
}

export function CommentSection({ postId, postAuthorId, isQuestion, onCommentAdded }: CommentSectionProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        createClient().auth.getUser().then(({ data }) => {
            setUserId(data.user?.id || null);
        });
    }, []);

    useEffect(() => {
        const fetchComments = async () => {
            const { data, error } = await createClient()
                .from("post_comments")
                .select(`
                    id,
                    content,
                    created_at,
                    user_id,
                    is_best_answer,
                    profiles (
                        full_name,
                        avatar_url,
                        is_verified_expert
                    )
                `)
                .eq("post_id", postId)
                .order("created_at", { ascending: true });

            if (error) {
                console.error("Error fetching comments:", error);
            } else {
                // Map to handle array vs object for profiles
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mappedComments = data?.map((comment: any) => ({
                    ...comment,
                    profiles: Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles
                })) as Comment[];
                setComments(mappedComments || []);
            }
            setLoading(false);
        };

        fetchComments();

        // Subscribe to real-time changes
        const channel = createClient()
            .channel(`comments:${postId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "post_comments",
                    filter: `post_id=eq.${postId}`
                },
                () => {
                    fetchComments();
                }
            )
            .subscribe();

        return () => {
            createClient().removeChannel(channel);
        };
    }, [postId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !userId) return;

        setSubmitting(true);
        try {
            const { error } = await createClient().from("post_comments").insert({
                post_id: postId,
                user_id: userId,
                content: newComment.trim()
            });

            if (error) throw error;

            setNewComment("");
            if (onCommentAdded) onCommentAdded();
        } catch (error) {
            console.error("Error adding comment:", error);
            alert("Yorum eklenirken bir hata oluştu.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (commentId: string) => {
        if (!confirm("Bu yorumu silmek istediğinize emin misiniz?")) return;

        try {
            const { error } = await createClient().from("post_comments").delete().eq("id", commentId);
            if (error) throw error;
            // Optimistic update
            setComments(comments.filter(c => c.id !== commentId));
        } catch (error) {
            console.error("Error deleting comment:", error);
            alert("Yorum silinirken bir hata oluştu.");
        }
    };

    const handleMarkBestAnswer = async (commentId: string) => {
        if (!confirm("Bu yorumu en iyi cevap / çözüm olarak işaretlemek istediğinize emin misiniz?")) return;

        try {
            // First, unmark any existing best answers for this post
            await createClient()
                .from("post_comments")
                .update({ is_best_answer: false })
                .eq("post_id", postId)
                .eq("is_best_answer", true);

            // Then, mark the new best answer
            const { error } = await createClient()
                .from("post_comments")
                .update({ is_best_answer: true })
                .eq("id", commentId);

            if (error) throw error;

            // Re-fetch comments to ensure correct order
            const { data } = await createClient()
                .from("post_comments")
                .select(`
                    id,
                    content,
                    created_at,
                    user_id,
                    is_best_answer,
                    profiles (
                        full_name,
                        avatar_url,
                        is_verified_expert
                    )
                `)
                .eq("post_id", postId)
                .order("created_at", { ascending: true });

            if (data) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mappedComments = data.map((comment: any) => ({
                    ...comment,
                    profiles: Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles
                })) as Comment[];
                setComments(mappedComments);
            }
        } catch (error) {
            console.error("Error marking best answer:", error);
            alert("İşlem sırasında bir hata oluştu.");
        }
    };

    if (loading) return <div className="text-center py-4 text-xs text-stone-400">Yorumlar yükleniyor...</div>;

    // Sort to show best answer first
    const sortedComments = [...comments].sort((a, b) => {
        if (a.is_best_answer && !b.is_best_answer) return -1;
        if (!a.is_best_answer && b.is_best_answer) return 1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    return (
        <div className="space-y-4 pt-2">
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {sortedComments.length === 0 ? (
                    <p className="text-center text-sm text-stone-400 py-2">Henüz yorum yok. İlk yorumu sen yap!</p>
                ) : (
                    sortedComments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 group">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                                <AvatarFallback>{comment.profiles?.full_name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                            </Avatar>
                            <div className={cn("flex-1 p-3 rounded-xl rounded-tl-none relative",
                                comment.is_best_answer ? "bg-emerald-50 border border-emerald-100" : "bg-stone-50")}
                            >
                                {comment.is_best_answer && (
                                    <div className="absolute -top-3 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                                        <BadgeCheck className="h-3 w-3" /> Çözüm
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-stone-900 inline-flex items-center gap-1">
                                        {comment.profiles?.full_name}
                                        {comment.profiles?.is_verified_expert && (
                                            <BadgeCheck className="h-3.5 w-3.5 text-teal-500" aria-label="Doğrulanmış Uzman" />
                                        )}
                                    </span>
                                    <span className="text-[10px] text-stone-400">
                                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: tr })}
                                    </span>
                                </div>
                                <p className={cn("text-sm mt-1", comment.is_best_answer ? "text-emerald-800 font-medium" : "text-stone-700")}>
                                    {comment.content}
                                </p>
                            </div>
                            <div className="flex flex-col gap-1 items-center self-center opacity-0 group-hover:opacity-100 transition-opacity">
                                {userId === postAuthorId && isQuestion && !comment.is_best_answer && (
                                    <button
                                        onClick={() => handleMarkBestAnswer(comment.id)}
                                        className="text-xs text-stone-400 hover:text-emerald-600 bg-white p-1 rounded-md shadow-sm border border-stone-100"
                                        title="Çözüm olarak işaretle"
                                    >
                                        <BadgeCheck className="h-4 w-4" />
                                    </button>
                                )}
                                {userId === comment.user_id && (
                                    <button
                                        onClick={() => handleDelete(comment.id)}
                                        className="text-stone-400 hover:text-red-500 bg-white p-1 rounded-md shadow-sm border border-stone-100"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {userId && (
                <form onSubmit={handleSubmit} className="flex gap-2 items-center border-t border-stone-100 pt-3">
                    <Avatar className="h-8 w-8 hidden sm:block">
                        {/* Current user avatar would go here if we fetched it, skipping for now to keep it simple */}
                        <AvatarFallback className="bg-teal-100 text-teal-600">S</AvatarFallback>
                    </Avatar>
                    <Input
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Bir yorum yaz..."
                        className="flex-1 h-9 text-sm bg-stone-50 border-stone-200 focus:bg-white transition-colors"
                        maxLength={500}
                    />
                    <Button
                        type="submit"
                        size="sm"
                        disabled={submitting || !newComment.trim()}
                        className={cn("h-9 w-9 p-0 shrink-0", submitting ? "opacity-50" : "")}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            )}
        </div>
    );
}
