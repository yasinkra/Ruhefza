"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/utils/cn";
import { Search, Bell, Check, X, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Conversation {
    id: string;
    partner_id: string;
    full_name: string;
    avatar_url: string | null;
    last_message_preview: string | null;
    last_message_at: string | null;
    unread_count: number;
}

interface ConnectionRequest {
    id: string;
    sender_id: string;
    sender_name: string;
    sender_avatar: string | null;
    created_at: string;
}

interface SearchUser {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string | null;
    username: string | null;
    custom_id: number | null;
}

interface ChatListProps {
    onSelectConversation: (conversationId: string, partnerId: string) => void;
    selectedConversationId: string | null;
}

export function ChatList({ onSelectConversation, selectedConversationId }: ChatListProps) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [foundUsers, setFoundUsers] = useState<SearchUser[]>([]);
    const [pendingRequests, setPendingRequests] = useState<ConnectionRequest[]>([]);
    const [showRequests, setShowRequests] = useState(false);
    const [sendingRequest, setSendingRequest] = useState<string | null>(null);
    const [connectionStatuses, setConnectionStatuses] = useState<Record<string, string>>({});

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                setCurrentUserId(data.user.id);
                fetchConversations(data.user.id);
                fetchPendingRequests(data.user.id);
            }
        });
    }, []);

    // Real-time subscription for new messages (update chat list order)
    useEffect(() => {
        if (!currentUserId) return;
        const channel = supabase
            .channel('chatlist_realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
                () => fetchConversations(currentUserId))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'connection_requests', filter: `receiver_id=eq.${currentUserId}` },
                () => fetchPendingRequests(currentUserId))
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [currentUserId]);

    const fetchConversations = async (userId: string) => {
        const { data, error } = await supabase
            .from("conversations")
            .select(`
                id,
                participant_1,
                participant_2,
                last_message_at,
                last_message_preview
            `)
            .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
            .order("last_message_at", { ascending: false });

        if (error) { setLoading(false); return; }

        if (!data || data.length === 0) { setLoading(false); setConversations([]); return; }

        // Get partner profiles
        const partnerIds = data.map(c => c.participant_1 === userId ? c.participant_2 : c.participant_1);
        const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", partnerIds);

        // Get unread counts
        const { data: unreadData } = await supabase
            .from("messages")
            .select("conversation_id")
            .in("conversation_id", data.map(c => c.id))
            .neq("sender_id", userId)
            .eq("is_read", false);

        const unreadCounts: Record<string, number> = {};
        unreadData?.forEach(m => {
            unreadCounts[m.conversation_id] = (unreadCounts[m.conversation_id] || 0) + 1;
        });

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const mapped: Conversation[] = data.map(c => {
            const partnerId = c.participant_1 === userId ? c.participant_2 : c.participant_1;
            const partner = profileMap.get(partnerId);
            return {
                id: c.id,
                partner_id: partnerId,
                full_name: partner?.full_name || "Kullanıcı",
                avatar_url: partner?.avatar_url || null,
                last_message_preview: c.last_message_preview,
                last_message_at: c.last_message_at,
                unread_count: unreadCounts[c.id] || 0,
            };
        });

        setConversations(mapped);
        setLoading(false);
    };

    const fetchPendingRequests = async (userId: string) => {
        const { data } = await supabase
            .from("connection_requests")
            .select(`
                id,
                sender_id,
                created_at,
                profiles!connection_requests_sender_id_fkey (full_name, avatar_url)
            `)
            .eq("receiver_id", userId)
            .eq("status", "pending");

        if (data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const requests: ConnectionRequest[] = data.map((r: any) => ({
                id: r.id,
                sender_id: r.sender_id,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                sender_name: (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles)?.full_name || "Kullanıcı",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                sender_avatar: (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles)?.avatar_url || null,
                created_at: r.created_at,
            }));
            setPendingRequests(requests);
        }
    };

    // User search
    useEffect(() => {
        const searchUsers = async () => {
            if (!searchTerm.trim() || !currentUserId) { setFoundUsers([]); return; }
            const term = searchTerm.trim();
            let query = supabase.from("profiles").select("id, full_name, avatar_url, role, username, custom_id").neq("id", currentUserId).limit(8);
            if (/^\d+$/.test(term)) query = query.eq("custom_id", parseInt(term));
            else if (term.startsWith('@')) query = query.ilike("username", `${term.substring(1)}%`);
            else query = query.or(`full_name.ilike.%${term}%,username.ilike.%${term}%`);
            const { data } = await query;
            if (data) setFoundUsers(data);

            // Also fetch connection statuses for found users
            if (data && data.length > 0) {
                const { data: reqData } = await supabase
                    .from("connection_requests")
                    .select("receiver_id, sender_id, status")
                    .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
                    .in(data[0] ? "receiver_id" : "sender_id", data.map(u => u.id));

                const statuses: Record<string, string> = {};
                reqData?.forEach(r => {
                    const partnerId = r.sender_id === currentUserId ? r.receiver_id : r.sender_id;
                    statuses[partnerId] = r.status;
                });
                // Also check if conversation already exists
                conversations.forEach(c => { statuses[c.partner_id] = 'connected'; });
                setConnectionStatuses(statuses);
            }
        };
        const t = setTimeout(searchUsers, 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, currentUserId]);

    const handleSendRequest = async (receiverId: string) => {
        if (!currentUserId) return;
        setSendingRequest(receiverId);
        const { error } = await supabase.from("connection_requests").insert({
            sender_id: currentUserId,
            receiver_id: receiverId,
            status: "pending"
        });
        if (error) {
            toast.error("İstek gönderilemedi: " + error.message);
        } else {
            toast.success("Bağlantı isteği gönderildi!");
            setConnectionStatuses(prev => ({ ...prev, [receiverId]: "pending" }));
        }
        setSendingRequest(null);
    };

    const handleRespondRequest = async (requestId: string, senderId: string, accept: boolean) => {
        const newStatus = accept ? "accepted" : "rejected";
        const { error } = await supabase
            .from("connection_requests")
            .update({ status: newStatus, responded_at: new Date().toISOString() })
            .eq("id", requestId);

        if (error) { toast.error("Bir hata oluştu."); return; }

        if (accept && currentUserId) {
            // Create conversation
            const { data: convId } = await supabase.rpc("get_or_create_conversation", {
                user_a: currentUserId,
                user_b: senderId
            });
            toast.success("Bağlantı kabul edildi! Artık mesajlaşabilirsiniz.");
            setPendingRequests(prev => prev.filter(r => r.id !== requestId));
            if (convId) fetchConversations(currentUserId);
        } else {
            toast.info("İstek reddedildi.");
            setPendingRequests(prev => prev.filter(r => r.id !== requestId));
        }
    };

    const filteredConversations = conversations.filter(c =>
        c.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="flex flex-col h-full bg-white animate-pulse">
            <div className="p-4 border-b border-slate-100">
                <div className="h-6 w-24 bg-slate-200 rounded mb-4"></div>
                <div className="h-10 w-full bg-slate-100 rounded-xl"></div>
            </div>
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3 p-4">
                    <div className="h-11 w-11 bg-slate-200 rounded-full shrink-0"></div>
                    <div className="flex-1">
                        <div className="h-4 w-28 bg-slate-200 rounded mb-2"></div>
                        <div className="h-3 w-40 bg-slate-100 rounded"></div>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-lg text-slate-800">Mesajlar</h2>
                    {pendingRequests.length > 0 && (
                        <button
                            onClick={() => setShowRequests(!showRequests)}
                            className="relative flex items-center gap-1.5 text-xs font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-full transition-colors"
                        >
                            <Bell className="h-3.5 w-3.5" />
                            {pendingRequests.length} İstek
                            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse"></span>
                        </button>
                    )}
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="İsim, @kullanıcı veya #ID ile ara..."
                        className="pl-9 bg-slate-50 border-slate-200 rounded-xl text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Pending Requests Panel */}
                {showRequests && pendingRequests.length > 0 && (
                    <div className="border-b border-slate-100 bg-sky-50/50 p-3 space-y-2">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1 mb-2">Bekleyen İstekler</p>
                        {pendingRequests.map(req => (
                            <div key={req.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={req.sender_avatar || undefined} />
                                    <AvatarFallback>{req.sender_name[0]?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-slate-800 truncate">{req.sender_name}</p>
                                    <p className="text-[11px] text-slate-400">
                                        {formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: tr })}
                                    </p>
                                </div>
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={() => handleRespondRequest(req.id, req.sender_id, true)}
                                        className="h-8 w-8 rounded-full bg-green-100 hover:bg-green-200 text-green-600 flex items-center justify-center transition-colors"
                                    >
                                        <Check className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleRespondRequest(req.id, req.sender_id, false)}
                                        className="h-8 w-8 rounded-full bg-red-100 hover:bg-red-200 text-red-500 flex items-center justify-center transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Search Results */}
                {searchTerm && foundUsers.length > 0 && (
                    <div className="border-b border-slate-100">
                        <p className="px-4 pt-3 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kullanıcılar</p>
                        {foundUsers.map(user => {
                            const status = connectionStatuses[user.id];
                            const existingConv = conversations.find(c => c.partner_id === user.id);
                            return (
                                <div key={user.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={user.avatar_url || undefined} />
                                        <AvatarFallback>{user.full_name[0]?.toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-slate-800 truncate">{user.full_name}</p>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                            {user.username && <span className="text-sky-600">@{user.username}</span>}
                                            {user.username && <span>·</span>}
                                            <span>{user.role === 'teacher' ? 'Öğretmen' : user.role === 'student' ? 'Öğrenci' : 'Ebeveyn'}</span>
                                        </div>
                                    </div>
                                    {existingConv ? (
                                        <Button size="sm" variant="outline" className="text-xs h-8 rounded-full"
                                            onClick={() => { onSelectConversation(existingConv.id, user.id); setSearchTerm(""); }}>
                                            Mesaj
                                        </Button>
                                    ) : status === 'connected' ? (
                                        <span className="text-xs text-green-600 font-medium">Bağlı</span>
                                    ) : status === 'pending' ? (
                                        <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                                            <Clock className="h-3 w-3" /> Bekliyor
                                        </span>
                                    ) : (
                                        <Button size="sm" className="text-xs h-8 rounded-full bg-sky-600 hover:bg-sky-700"
                                            onClick={() => handleSendRequest(user.id)}
                                            disabled={sendingRequest === user.id}>
                                            {sendingRequest === user.id ? "..." : "Bağlan"}
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Conversations List */}
                {!searchTerm && filteredConversations.length === 0 && (
                    <div className="p-8 text-center text-slate-400">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Search className="h-7 w-7 text-slate-300" />
                        </div>
                        <p className="text-sm font-medium">Henüz mesajlaşmanız yok.</p>
                        <p className="text-xs mt-1">Yukarıdan kişi arayarak bağlanın.</p>
                    </div>
                )}

                {filteredConversations.map(conv => (
                    <div
                        key={conv.id}
                        onClick={() => onSelectConversation(conv.id, conv.partner_id)}
                        className={cn(
                            "flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all border-b border-slate-50",
                            selectedConversationId === conv.id
                                ? "bg-sky-50 border-r-2 border-r-sky-500"
                                : "hover:bg-slate-50"
                        )}
                    >
                        <div className="relative shrink-0">
                            <Avatar className="h-11 w-11">
                                <AvatarImage src={conv.avatar_url || undefined} />
                                <AvatarFallback>{conv.full_name[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            {conv.unread_count > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[1rem] px-1 text-[10px] font-bold text-white bg-sky-500 rounded-full flex items-center justify-center">
                                    {conv.unread_count}
                                </span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline">
                                <span className={cn("font-semibold text-sm truncate", conv.unread_count > 0 ? "text-slate-900" : "text-slate-700")}>
                                    {conv.full_name}
                                </span>
                                {conv.last_message_at && (
                                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                                        {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false, locale: tr })}
                                    </span>
                                )}
                            </div>
                            <p className={cn("text-xs truncate mt-0.5", conv.unread_count > 0 ? "text-slate-800 font-medium" : "text-slate-400")}>
                                {conv.last_message_preview || "Sohbet başlat..."}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
