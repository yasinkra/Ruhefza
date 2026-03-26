import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, ArrowLeft, Download, FileText, Clock, X, Phone, Video, MoreVertical, Smile, BookOpen, ArrowRight } from "lucide-react";
import imageCompression from "browser-image-compression";
import { cn } from "@/utils/cn";
import { format, differenceInDays, isToday, isYesterday } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

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
    isOnline?: (userId: string) => boolean;
}

function getDaysUntilDeletion(sentAt: string): number {
    return Math.max(0, 7 - differenceInDays(new Date(), new Date(sentAt)));
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatWindow({ conversationId, partnerId, onBack, isOnline }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

    function scrollToBottom(smooth = true) {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
        }, 50);
    }

    // Close emoji picker on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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
        if (!content || !currentUserId) return;
        setNewMessage("");

        // Optimistic update
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`;
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
        const maxSize = isImage ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error(isImage ? "Görsel maksimum 5MB olabilir." : "Belge maksimum 10MB olabilir.");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setUploading(true);

        let fileToUpload: File = file;
        
        // Compress image before upload
        if (isImage) {
            try {
                const options = {
                    maxSizeMB: 1, // Max size 1MB
                    maxWidthOrHeight: 1920,
                    useWebWorker: true
                };
                const compressedBlob = await imageCompression(file, options);
                fileToUpload = new File([compressedBlob], file.name, { type: file.type });
            } catch (error) {
                console.error("Görsel sıkıştırma hatası:", error);
                // Fall back to original file if compression fails
            }
        }

        const ext = fileToUpload.name.split(".").pop();
        const filePath = `${currentUserId}/${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;

        const { error: uploadError } = await createClient().storage
            .from("message-files")
            .upload(filePath, fileToUpload);

        if (uploadError) {
            toast.error("Dosya yüklenemedi: " + uploadError.message);
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        // private bucket olan durumlarda publicUrl erişim hatası (403/400) vereceği için, 
        // 10 yıllık (315360000 saniye) geçerliliği olan bir signed url oluşturuyoruz.
        const { data: signedData, error: signedError } = await createClient().storage
            .from("message-files")
            .createSignedUrl(filePath, 315360000);

        const finalUrl = signedData?.signedUrl || createClient().storage.from("message-files").getPublicUrl(filePath).data.publicUrl;

        const { error: msgError } = await createClient().from("messages").insert({
            conversation_id: conversationId,
            sender_id: currentUserId,
            content: null,
            type: isImage ? "image" : "document",
            file_url: finalUrl,
            file_name: fileToUpload.name,
            file_size_bytes: fileToUpload.size,
        });

        if (msgError) toast.error("Mesaj kaydedilemedi.");
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleDownload = (e: React.MouseEvent<HTMLButtonElement | HTMLDivElement>, url: string, filename: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Supabase URL'lerine download parametresi eklendiğinde content-disposition
        // attachment olarak yanıt verir ve native indirmeyi zorlar (mobil uyumlu).
        const downloadUrl = url.includes('?') 
            ? `${url}&download=${encodeURIComponent(filename)}` 
            : `${url}?download=${encodeURIComponent(filename)}`;
            
        // Bir gizli a etiketi ile native indirmeyi tetikle
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
            <div className="h-16 border-b border-gray-200 bg-white flex items-center px-4 gap-3 shrink-0">
                <div className="h-9 w-9 bg-gray-200 rounded-full"></div>
                <div className="space-y-2">
                    <div className="h-4 w-32 bg-gray-200 rounded"></div>
                    <div className="h-3 w-20 bg-gray-100 rounded"></div>
                </div>
            </div>
            <div className="flex-1 p-4 space-y-4 bg-gray-50/50">
                <div className="flex justify-start"><div className="h-12 w-40 bg-gray-200 rounded-2xl rounded-bl-none"></div></div>
                <div className="flex justify-end"><div className="h-10 w-56 bg-[#c3d6cb] rounded-2xl rounded-br-none"></div></div>
                <div className="flex justify-start"><div className="h-8 w-32 bg-gray-200 rounded-2xl rounded-bl-none"></div></div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="h-16 border-b border-gray-200 bg-white flex items-center px-4 justify-between shrink-0">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <Button variant="ghost" size="icon" className="md:hidden -ml-2 text-gray-500" onClick={onBack}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    )}
                    <Link href={`/profile/${partnerId}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
                        <div className="relative">
                            <Avatar className="h-9 w-9 border-2 border-white shadow">
                                <AvatarImage src={partnerProfile.avatar_url || undefined} />
                                <AvatarFallback>{partnerProfile.full_name[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${isOnline && isOnline(partnerId) ? 'bg-green-500' : 'bg-gray-300'} border-2 border-white rounded-full`}></span>
                        </div>
                        <div>
                            <p className="font-semibold text-sm text-gray-900">{partnerProfile.full_name}</p>
                            {isOnline && isOnline(partnerId) ? (
                                <p className="text-xs text-[#0c9789] font-medium">Çevrimiçi</p>
                            ) : (
                                <p className="text-xs text-gray-400">Çevrimdışı</p>
                            )}
                        </div>
                    </Link>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-500 hover:text-[#0c9789] hover:bg-[#f0fdfa] rounded-lg">
                        <Phone className="h-4.5 w-4.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-500 hover:text-[#0c9789] hover:bg-[#f0fdfa] rounded-lg">
                        <Video className="h-4.5 w-4.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-500 hover:text-[#0c9789] hover:bg-[#f0fdfa] rounded-lg">
                        <MoreVertical className="h-4.5 w-4.5" />
                    </Button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/40">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center">
                        <div className="w-16 h-16 bg-[#f0fdfa] rounded-full flex items-center justify-center mb-4">
                            <Send className="h-6 w-6 text-[#0c9789]" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">Sohbet başlıyor!</p>
                        <p className="text-xs mt-1">İlk mesajı gönder...</p>
                    </div>
                )}

                {messages.map((msg, index) => {
                    const isMe = msg.sender_id === currentUserId;
                    const showAvatar = !isMe && (index === 0 || messages[index - 1].sender_id !== msg.sender_id);
                    const daysLeft = getDaysUntilDeletion(msg.sent_at);
                    const isExpiringSoon = daysLeft <= 1;

                    const msgDate = new Date(msg.sent_at);
                    let showDateSeparator = false;
                    let dateLabel = "";

                    if (index === 0) {
                        showDateSeparator = true;
                    } else {
                        const prevDate = new Date(messages[index - 1].sent_at);
                        if (prevDate.toDateString() !== msgDate.toDateString()) {
                            showDateSeparator = true;
                        }
                    }

                    if (showDateSeparator) {
                        if (isToday(msgDate)) dateLabel = "Bugün";
                        else if (isYesterday(msgDate)) dateLabel = "Dün";
                        else dateLabel = format(msgDate, "d MMMM yyyy", { locale: tr });
                    }

                    return (
                        <div key={msg.id} className="flex flex-col w-full">
                            {showDateSeparator && (
                                <div className="flex justify-center my-4">
                                    <span className="text-[10px] font-medium bg-gray-200/50 text-gray-500 px-3 py-1 rounded-full">
                                        {dateLabel}
                                    </span>
                                </div>
                            )}

                            {msg.deleted_by_sender ? (
                                <div className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                                    <p className="text-xs text-gray-400 italic bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
                                        {isMe ? "Bu mesajı sildiniz" : "Bu mesaj silindi"}
                                    </p>
                                </div>
                            ) : (
                                <div className={cn("flex w-full items-end gap-2 group", isMe ? "justify-end" : "justify-start")}>
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
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 shrink-0 p-1"
                                            title="Mesajı sil"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}

                                    <div className={cn("max-w-[72%] flex flex-col gap-0.5", isMe ? "items-end" : "items-start")}>
                                        {/* Bubble */}
                                        <div className={cn(
                                            "rounded-[24px] overflow-hidden shadow-md",
                                            isMe
                                                ? cn("rounded-br-[4px] bg-[#0c9789] text-white", msg._temp && "opacity-60")
                                                : "rounded-bl-[4px] bg-white text-gray-800 border border-gray-100",
                                        )}>
                                            {/* Image */}
                                            {msg.type === "image" && msg.file_url && (
                                                <div className="relative group/img">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img 
                                                        src={msg.file_url} 
                                                        alt="Görsel" 
                                                        onClick={() => setSelectedImage(msg.file_url!)}
                                                        className="max-w-[280px] max-h-[300px] object-cover block cursor-pointer" 
                                                    />
                                                    <button 
                                                        onClick={(e) => handleDownload(e, msg.file_url!, msg.file_name || "image")}
                                                        className="absolute bottom-2 right-2 bg-black/40 hover:bg-black/80 text-white rounded-full p-2 transition-colors">
                                                        <Download className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            )}
                                            {/* Document */}
                                            {msg.type === "document" && msg.file_url && (
                                                <button 
                                                    onClick={(e) => handleDownload(e, msg.file_url!, msg.file_name || "document")}
                                                    className={cn("flex w-full items-center gap-3 px-4 py-3 hover:opacity-90 transition-opacity text-left", isMe ? "text-white" : "text-gray-700")}>
                                                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", isMe ? "bg-white/20" : "bg-red-50")}>
                                                        <FileText className={cn("h-5 w-5", isMe ? "text-white" : "text-red-500")} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-semibold truncate max-w-[160px]">{msg.file_name}</p>
                                                        {msg.file_size_bytes && (
                                                            <p className={cn("text-[10px] mt-0.5", isMe ? "text-[#f0fdfa]" : "text-gray-400")}>
                                                                {formatFileSize(msg.file_size_bytes)}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <Download className="h-4 w-4 shrink-0 opacity-70" />
                                                </button>
                                            )}
                                            {/* Text or Article Share */}
                                            {msg.type === "text" && msg.content && (
                                                <>
                                                    {msg.content.startsWith("[ARTICLE_SHARE]:") ? (() => {
                                                        try {
                                                            const data = JSON.parse(msg.content.replace("[ARTICLE_SHARE]:", ""));
                                                            return (
                                                                <Link 
                                                                    href={`/knowledge/${data.id}`}
                                                                    className="block group/article hover:opacity-95 transition-all"
                                                                >
                                                                    <div className="w-[280px] bg-white rounded-2xl overflow-hidden overflow-hidden border border-gray-100/50 shadow-sm">
                                                                        {data.image_url && (
                                                                            <div className="aspect-[16/9] w-full relative">
                                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                                <img 
                                                                                    src={data.image_url} 
                                                                                    alt={data.title} 
                                                                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/article:scale-105" 
                                                                                />
                                                                                <div className="absolute top-2 left-2">
                                                                                    <Badge className="bg-emerald-500/90 text-white border-none text-[10px] px-2 py-0">Makale</Badge>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        <div className="p-4 bg-white">
                                                                            <h4 className="font-bold text-gray-900 text-sm mb-1.5 line-clamp-2 leading-relaxed">
                                                                                {data.title}
                                                                            </h4>
                                                                            <p className="text-[12px] text-gray-500 line-clamp-2 leading-snug mb-3">
                                                                                {data.summary}
                                                                            </p>
                                                                            <div className="flex items-center justify-between">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center">
                                                                                        <BookOpen className="w-3 h-3 text-emerald-600" />
                                                                                    </div>
                                                                                    <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">İncele</span>
                                                                                </div>
                                                                                <ArrowRight className="w-3.5 h-3.5 text-emerald-400 group-hover/article:translate-x-1 transition-transform" />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </Link>
                                                            );
                                                        } catch (e) {
                                                            return <p className="px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>;
                                                        }
                                                    })() : (
                                                        <p className="px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {/* Meta row */}
                                        <div className={cn("flex items-center gap-1.5 px-1", isMe ? "flex-row-reverse" : "flex-row")}>
                                            <span className="text-[10px] text-gray-400">
                                                {format(new Date(msg.sent_at), "HH:mm", { locale: tr })}
                                            </span>
                                            {/* Read receipt — only for own messages */}
                                            {isMe && (
                                                <span className={cn(
                                                    "text-[10px] font-bold",
                                                    msg._temp ? "text-gray-300" :
                                                        msg.is_read ? "text-[#f0fdfa]" : "text-gray-300"
                                                )}>
                                                    {msg._temp ? "⏳" : msg.is_read ? "✓✓" : "✓"}
                                                </span>
                                            )}
                                            {isExpiringSoon && !msg._temp && (msg.type === "image" || msg.type === "document") && (
                                                <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                                                    <Clock className="h-2.5 w-2.5" />
                                                    {daysLeft === 0 ? "bugün silinecek" : "yarın silinecek"}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Emoji Picker */}
            {showEmojiPicker && (
                <div ref={emojiPickerRef} className="border-t border-gray-100 bg-white px-3 pt-2 pb-1">
                    <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto p-1">
                        {["😊","😂","🥰","😍","😘","🤗","😅","😎","🤔","😢","😭","🥺","😡","🤯","🥳","🎉","❤️","🧡","💛","💚","💙","💜","🖤","💕","👋","👍","👏","🙏","✌️","🤝","💪","🫶","✅","⭐","🔥","💡","📚","🏫","👨‍👩‍👧","👨‍👩‍👦","🧸","🎈","🌈","🌸","🐶","🐱","🦋","🐣"].map((emoji) => (
                            <button
                                key={emoji}
                                type="button"
                                className="w-9 h-9 flex items-center justify-center text-xl hover:bg-gray-100 rounded-lg transition-colors"
                                onClick={() => {
                                    setNewMessage(prev => prev + emoji);
                                    setShowEmojiPicker(false);
                                }}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-gray-100 shrink-0">
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
                        className="shrink-0 text-gray-400 hover:text-[#0c9789] hover:bg-[#f0fdfa] h-9 w-9"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        title="Dosya veya görsel gönder">
                        {uploading
                            ? <div className="h-4 w-4 border-2 border-[#0c9789] border-t-transparent rounded-full animate-spin" />
                            : <Paperclip className="h-5 w-5" />}
                    </Button>
                    <Button type="button" variant="ghost" size="icon"
                        className="shrink-0 text-gray-400 hover:text-[#0c9789] hover:bg-[#f0fdfa] h-9 w-9"
                        title="Emoji"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                        <Smile className="h-5 w-5" />
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
                        onFocus={() => {
                            window.dispatchEvent(new CustomEvent('hide-bottom-nav'));
                            document.body.setAttribute('data-hide-nav', 'true');
                        }}
                        onBlur={() => {
                            // Small delay to allow click events on buttons to register before layout shifts
                            setTimeout(() => {
                                window.dispatchEvent(new CustomEvent('show-bottom-nav'));
                                document.body.removeAttribute('data-hide-nav');
                            }, 200);
                        }}
                        placeholder="Mesajınızı yazın..."
                        rows={1}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        inputMode="text"
                        className="flex-1 resize-none rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c9789]/20 focus:border-[#0c9789]/40 focus:bg-white transition-all max-h-32 overflow-y-auto min-h-[40px]"
                    />
                    <Button type="submit" size="icon"
                        className="shrink-0 bg-[#0c9789] hover:bg-[#0a7c70] text-white shadow-md h-10 w-10 rounded-full"
                        disabled={!newMessage.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>

            {/* Fullscreen Image Modal (Lightbox) */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => setSelectedImage(null)}
                >
                    <button 
                        className="absolute top-4 right-4 bg-white/10 text-white rounded-full p-2 hover:bg-white/20 transition-colors"
                        onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
                    >
                        <X className="h-6 w-6" />
                    </button>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                        src={selectedImage} 
                        alt="Tam ekran görsel" 
                        className="max-w-full max-h-[85vh] object-contain rounded-md"
                        onClick={(e) => e.stopPropagation()} 
                    />
                    <button 
                        className="absolute bottom-8 bg-white/10 hover:bg-white/20 text-white rounded-full py-2.5 px-5 backdrop-blur-md transition flex items-center gap-2 shadow-lg"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(e as any, selectedImage, "downloaded-image");
                        }}
                    >
                         <Download className="h-4 w-4" />
                         <span className="text-sm font-medium">İndir</span>
                    </button>
                </div>
            )}
        </div >
    );
}
