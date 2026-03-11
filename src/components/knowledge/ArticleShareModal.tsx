"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X, Send, Check, Search } from "lucide-react";
import { toast } from "sonner";
import type { Article } from "./ArticleCard";

interface ConnectedUser {
    id: string;
    full_name: string;
    avatar_url: string | null;
}

interface ArticleShareModalProps {
    article: Article;
    currentUserId: string;
    onClose: () => void;
}

export function ArticleShareModal({ article, currentUserId, onClose }: ArticleShareModalProps) {
    const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState<string | null>(null);
    const [sent, setSent] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchConnections = async () => {
            // Get accepted connections where user is either sender or receiver
            const { data } = await createClient()
                .from("connection_requests")
                .select(`
                    sender_id,
                    receiver_id
                `)
                .eq("status", "accepted")
                .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

            if (!data || data.length === 0) { setLoading(false); return; }

            const partnerIds = data.map(r =>
                r.sender_id === currentUserId ? r.receiver_id : r.sender_id
            );

            const { data: profiles } = await createClient()
                .from("profiles")
                .select("id, full_name, avatar_url")
                .in("id", partnerIds);

            setConnectedUsers(profiles || []);
            setLoading(false);
        };
        fetchConnections();
    }, [currentUserId]);

    const handleShare = async (partnerId: string) => {
        setSending(partnerId);
        
        // Construct structured share data
        const shareData = {
            id: article.id,
            title: article.title,
            summary: article.summary,
            image_url: article.image_url,
            author_name: article.author?.full_name
        };
        const shareMessage = `[ARTICLE_SHARE]:${JSON.stringify(shareData)}`;

        // Get or create conversation
        const { data: convId, error: convErr } = await createClient().rpc("get_or_create_conversation", {
            user_a: currentUserId,
            user_b: partnerId
        });

        if (convErr || !convId) {
            toast.error("Sohbet başlatılamadı.");
            setSending(null);
            return;
        }

        const { error } = await createClient().from("messages").insert({
            conversation_id: convId,
            sender_id: currentUserId,
            content: shareMessage,
            type: "text",
        });

        if (error) {
            toast.error("Paylaşılamadı: " + error.message);
        } else {
            setSent(prev => new Set([...prev, partnerId]));
            toast.success("Makale paylaşıldı!");
        }
        setSending(null);
    };

    const filtered = connectedUsers.filter(u =>
        u.full_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-stone-100">
                    <div>
                        <h2 className="font-bold text-stone-900">Makaleyi Paylaş</h2>
                        <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{article.title}</p>
                    </div>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 pt-3 pb-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Kişi ara..."
                            className="w-full pl-8 pr-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300"
                        />
                    </div>
                </div>

                {/* Users list */}
                <div className="max-h-72 overflow-y-auto px-2 pb-3">
                    {loading && (
                        <div className="flex items-center justify-center py-8">
                            <div className="h-5 w-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                    {!loading && filtered.length === 0 && (
                        <div className="text-center py-8 text-stone-400">
                            <p className="text-sm">Bağlı kullanıcı bulunamadı.</p>
                            <p className="text-xs mt-1">Paylaşmak için önce bağlantı isteği gönder.</p>
                        </div>
                    )}
                    {filtered.map(user => {
                        const isSending = sending === user.id;
                        const wasSent = sent.has(user.id);
                        return (
                            <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={user.avatar_url || undefined} />
                                    <AvatarFallback>{user.full_name[0]?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <p className="flex-1 font-medium text-sm text-stone-800">{user.full_name}</p>
                                <Button
                                    size="sm"
                                    className={wasSent
                                        ? "bg-green-100 text-green-600 hover:bg-green-100 rounded-full h-8 px-3"
                                        : "bg-teal-500 hover:bg-teal-600 text-white rounded-full h-8 px-3"
                                    }
                                    onClick={() => !wasSent && handleShare(user.id)}
                                    disabled={isSending || wasSent}
                                >
                                    {isSending ? (
                                        <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : wasSent ? (
                                        <><Check className="h-3.5 w-3.5 mr-1" /> Gönderildi</>
                                    ) : (
                                        <><Send className="h-3.5 w-3.5 mr-1" /> Gönder</>
                                    )}
                                </Button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
