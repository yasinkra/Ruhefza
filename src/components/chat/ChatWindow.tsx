import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, ArrowLeft, Download, FileText, Clock, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { format, differenceInDays } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import Link from "next/link";

interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string | null;
    type: "text" | "image" | "document";
    file_url: string | null;
    file_name: string | null;
    file_size_bytes: number | null;
    is_read: boolean;
    deleted_by_sender: boolean;
    sent_at: string;
    _temp?: boolean; // for optimistic updates
}

interface PartnerProfile {
    full_name: string;
    avatar_url: string | null;
    role: string | null;
}

interface ChatWindowProps {
    conversationId: string;
    partnerId: string;
    onBack?: () => void;
}

function getDaysUntilDeletion(sentAt: string): number {
    return Math.max(0, 7 - differenceInDays(new Date(), new Date(sentAt)));
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatWindow({ conversationId, partnerId, onBack }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    function scrollToBottom(smooth = true) {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
        }, 50);
    }

    const markMessagesAsRead = useCallback(async (msgs: Message[], userId: string) => {
        const unreadIds = msgs
            .filter(m => m.sender_id !== userId && !m.is_read && !m._temp)
            .map(m => m.id);
        if (unreadIds.length > 0) {
            await createClient().from("messages").update({ is_read: true }).in("id", unreadIds);
        }
    }, []);

    const fetchMessages = useCallback(async (userId: string) => {
        const { data, error } = await createClient()
            .from("messages")
            .select("*")
            .eq("conversation_id", conversationId)
            .order("sent_at", { ascending: true });

        if (!error && data) {
            setMessages(data as Message[]);
            scrollToBottom(false);
            markMessagesAsRead(data as Message[], userId);
        }
        setLoading(false);
    }, [conversationId, markMessagesAsRead]);

    useEffect(() => {
        let uid: string;
        createClient().auth.getUser().then(({ data }) => {
            if (data.user) {
                uid = data.user.id;
                setCurrentUserId(data.user.id);
                fetchMessages(data.user.id);
            }
        });
        createClient().from("profiles")
            .select("full_name, avatar_url, role")
            .eq("id", partnerId)
            .single()
            .then(({ data }) => setPartnerProfile(data));
    }, [conversationId, partnerId, fetchMessages]);

    // Real-time subscription
    useEffect(() => {
        if (!currentUserId) return;

        const channel = createClient()
            .channel(`conv:${conversationId}:${currentUserId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`,
            }, (payload) => {
                const newMsg = payload.new as Message;
                setMessages(prev => {
                    // Remove any matching temp message (for own sends), then add real
                    const withoutTemp = prev.filter(m => !(m._temp && m.sender_id === newMsg.sender_id && m.content === newMsg.content));
                    if (withoutTemp.find(m => m.id === newMsg.id)) return withoutTemp;
                    return [...withoutTemp, newMsg];
                });
                scrollToBottom();
                // Auto-mark as read if message is from partner and we're viewing
                if (newMsg.sender_id !== currentUserId) {
                    createClient().from("messages").update({ is_read: true }).eq("id", newMsg.id);
                    // Update local state to show as read for the partner
                    setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, is_read: true } : m));
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`,
            }, (payload) => {
                const updatedMsg = payload.new as Message;
                setMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m));
            })
            .subscribe();

        return () => { createClient().removeChannel(channel); };
    }, [currentUserId, conversationId]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const content = newMessage.trim();
        if (!content || !currentUserId || sending) return;
        setNewMessage("");
        setSending(true);

        // Optimistic update
        const tempId = `temp-${Date.now()}`;
        const tempMsg: Message = {
            id: tempId,
            conversation_id: conversationId,
            sender_id: currentUserId,
            content,
            type: "text",
            file_url: null,
            file_name: null,
            file_size_bytes: null,
            is_read: false,
            deleted_by_sender: false,
            sent_at: new Date().toISOString(),
            _temp: true,
        };
        setMessages(prev => [...prev, tempMsg]);
        scrollToBottom();

        const { error } = await createClient().from("messages").insert({
            conversation_id: conversationId,
            sender_id: currentUserId,
            content,
            type: "text",
        });

        if (error) {
            toast.error("Mesaj gönderilemedi.");
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setNewMessage(content);
        }
        // Realtime subscription will replace temp with real
        setSending(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUserId) return;

        const isImage = file.type.startsWith("image/");
        const isPdf = file.type === "application/pdf";

        if (!isImage && !isPdf) {
            toast.error("Sadece görsel (JPG, PNG, WebP) veya PDF belgesi gönderilebilir.");
            return;
        }
        const maxSize = isImage ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error(isImage ? "Görsel maksimum 2MB olabilir." : "Belge maksimum 5MB olabilir.");
            return;
        }

        setUploading(true);
        const ext = file.name.split(".").pop();
        const filePath = `${currentUserId}/${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;

        const { error: uploadError } = await createClient().storage
            .from("message-files")
            .upload(filePath, file);

        if (uploadError) {
            toast.error("Dosya yüklenemedi: " + uploadError.message);
            setUploading(false);
            return;
        }

        const { data: { publicUrl } } = createClient().storage.from("message-files").getPublicUrl(filePath);

        const { error: msgError } = await createClient().from("messages").insert({
            conversation_id: conversationId,
            sender_id: currentUserId,
            content: null,
            type: isImage ? "image" : "document",
            file_url: publicUrl,
            file_name: file.name,
            file_size_bytes: file.size,
        });

        if (msgError) toast.error("Mesaj kaydedilemedi.");
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleDeleteMessage = async (messageId: string) => {
        // Optimistic UI update first
        setMessages(prev =>
            prev.map(m => m.id === messageId
                ? { ...m, deleted_by_sender: true, content: null }
                : m
            )
        );

        const { error } = await createClient()
            .from("messages")
            .update({ deleted_by_sender: true, content: null })
            .eq("id", messageId)
            .eq("sender_id", currentUserId!); // extra safety

        if (error) {
            toast.error("Mesaj silinemedi: " + error.message);
            // Revert optimistic update
            fetchMessages(currentUserId!);
        }
    };

    if (loading || !partnerProfile) return (
        <div className="flex flex-col h-full animate-pulse">
            <div className="h-16 border-b border-slate-200 bg-white flex items-center px-4 gap-3 shrink-0">
                <div className="h-9 w-9 bg-slate-200 rounded-full"></div>
                <div className="space-y-2">
                    <div className="h-4 w-32 bg-slate-200 rounded"></div>
                    <div className="h-3 w-20 bg-slate-100 rounded"></div>
                </div>
            </div>
            <div className="flex-1 p-4 space-y-4 bg-slate-50/50">
                <div className="flex justify-start"><div className="h-12 w-40 bg-slate-200 rounded-2xl rounded-bl-none"></div></div>
                <div className="flex justify-end"><div className="h-10 w-56 bg-sky-200 rounded-2xl rounded-br-none"></div></div>
                <div className="flex justify-start"><div className="h-8 w-32 bg-slate-200 rounded-2xl rounded-bl-none"></div></div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="h-16 border-b border-slate-200 bg-white flex items-center px-4 justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <Button variant="ghost" size="icon" className="md:hidden -ml-2 text-slate-500" onClick={onBack}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    )}
                    <Link href={`/profile/${partnerId}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
                        <Avatar className="h-9 w-9 border-2 border-white shadow">
                            <AvatarImage src={partnerProfile.avatar_url || undefined} />
                            <AvatarFallback>{partnerProfile.full_name[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold text-sm text-slate-900">{partnerProfile.full_name}</p>
                            <p className="text-xs text-slate-400">
                                {partnerProfile.role === 'teacher' ? 'Öğretmen' : partnerProfile.role === 'student' ? 'Öğrenci' : 'Ebeveyn'} · Profile git →
                            </p>
                        </div>
                    </Link>
                </div>
                <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-2 py-1 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" /> 7 günde silinir
                </span>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/40">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center">
                        <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center mb-4">
                            <Send className="h-6 w-6 text-sky-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">Sohbet başlıyor!</p>
                        <p className="text-xs mt-1">İlk mesajı gönder...</p>
                    </div>
                )}

                {messages.map((msg, index) => {
                    const isMe = msg.sender_id === currentUserId;
                    const showAvatar = !isMe && (index === 0 || messages[index - 1].sender_id !== msg.sender_id);
                    const daysLeft = getDaysUntilDeletion(msg.sent_at);
                    const isExpiringSoon = daysLeft <= 1;

                    if (msg.deleted_by_sender) {
                        return (
                            <div key={msg.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                                <p className="text-xs text-slate-400 italic bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                                    {isMe ? "Bu mesajı sildiniz" : "Bu mesaj silindi"}
                                </p>
                            </div>
                        );
                    }

                    return (
                        <div key={msg.id} className={cn("flex w-full items-end gap-2 group", isMe ? "justify-end" : "justify-start")}>
                            {/* Partner avatar */}
                            {!isMe && (
                                <div className="w-7 shrink-0">
                                    {showAvatar ? (
                                        <Avatar className="h-7 w-7">
                                            <AvatarImage src={partnerProfile.avatar_url || undefined} />
                                            <AvatarFallback className="text-[10px]">{partnerProfile.full_name[0]}</AvatarFallback>
                                        </Avatar>
                                    ) : null}
                                </div>
                            )}

                            {/* Delete button (left of bubble for own msgs) */}
                            {isMe && !msg._temp && (
                                <button
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-400 shrink-0 p-1"
                                    title="Mesajı sil"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}

                            <div className={cn("max-w-[72%] flex flex-col gap-0.5", isMe ? "items-end" : "items-start")}>
                                {/* Bubble */}
                                <div className={cn(
                                    "rounded-2xl overflow-hidden shadow-sm",
                                    isMe
                                        ? cn("rounded-br-none bg-sky-500 text-white", msg._temp && "opacity-60")
                                        : "rounded-bl-none bg-white text-slate-800 border border-slate-100",
                                )}>
                                    {/* Image */}
                                    {msg.type === "image" && msg.file_url && (
                                        <div className="relative">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={msg.file_url} alt="Görsel" className="max-w-[280px] max-h-[300px] object-cover block" />
                                            <a href={msg.file_url} download={msg.file_name || "image"} target="_blank" rel="noopener noreferrer"
                                                className="absolute bottom-2 right-2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors">
                                                <Download className="h-3.5 w-3.5" />
                                            </a>
                                        </div>
                                    )}
                                    {/* Document */}
                                    {msg.type === "document" && msg.file_url && (
                                        <a href={msg.file_url} download={msg.file_name || "document"} target="_blank" rel="noopener noreferrer"
                                            className={cn("flex items-center gap-3 px-4 py-3 hover:opacity-90 transition-opacity", isMe ? "text-white" : "text-slate-700")}>
                                            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", isMe ? "bg-white/20" : "bg-red-50")}>
                                                <FileText className={cn("h-5 w-5", isMe ? "text-white" : "text-red-500")} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold truncate max-w-[160px]">{msg.file_name}</p>
                                                {msg.file_size_bytes && (
                                                    <p className={cn("text-[10px] mt-0.5", isMe ? "text-sky-100" : "text-slate-400")}>
                                                        {formatFileSize(msg.file_size_bytes)}
                                                    </p>
                                                )}
                                            </div>
                                            <Download className="h-4 w-4 shrink-0 opacity-70" />
                                        </a>
                                    )}
                                    {/* Text */}
                                    {msg.type === "text" && msg.content && (
                                        <p className="px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                    )}
                                </div>

                                {/* Meta row */}
                                <div className={cn("flex items-center gap-1.5 px-1", isMe ? "flex-row-reverse" : "flex-row")}>
                                    <span className="text-[10px] text-slate-400">
                                        {format(new Date(msg.sent_at), "HH:mm", { locale: tr })}
                                    </span>
                                    {/* Read receipt — only for own messages */}
                                    {isMe && (
                                        <span className={cn(
                                            "text-[10px] font-bold",
                                            msg._temp ? "text-slate-300" :
                                                msg.is_read ? "text-sky-400" : "text-slate-300"
                                        )}>
                                            {msg._temp ? "⏳" : msg.is_read ? "✓✓" : "✓"}
                                        </span>
                                    )}
                                    {isExpiringSoon && !msg._temp && (
                                        <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                                            <Clock className="h-2.5 w-2.5" />
                                            {daysLeft === 0 ? "bugün silinecek" : "yarın silinecek"}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-slate-100 shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                    />
                    <Button type="button" variant="ghost" size="icon"
                        className="shrink-0 text-slate-400 hover:text-sky-600 hover:bg-sky-50"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        title="Dosya veya görsel gönder">
                        {uploading
                            ? <div className="h-4 w-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                            : <Paperclip className="h-5 w-5" />}
                    </Button>
                    <textarea
                        value={newMessage}
                        onChange={(e) => {
                            setNewMessage(e.target.value);
                            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                            typingTimeoutRef.current = setTimeout(() => { }, 2000);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (newMessage.trim()) handleSendMessage(e as unknown as React.FormEvent);
                            }
                        }}
                        placeholder="Mesaj yaz... (Enter gönder, Shift+Enter yeni satır)"
                        rows={1}
                        className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:bg-white transition-all max-h-32 overflow-y-auto"
                    />
                    <Button type="submit" size="icon"
                        className="shrink-0 bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-200 h-10 w-10"
                        disabled={!newMessage.trim() || sending}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
                <p className="text-[10px] text-slate-300 text-center mt-1.5">
                    Mesajlar 7 gün sonra silinir · Görsel: maks 2MB · Belge: maks 5MB
                </p>
            </div>
        </div>
    );
}
