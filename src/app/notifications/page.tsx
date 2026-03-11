"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Bell, Heart, MessageSquare, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { tr } from "date-fns/locale";
import { createClient } from "@/utils/supabase/client";

// Tab Type
type TabType = "Tümü" | "Beğeniler" | "Yorumlar" | "Bağlantı İstekleri" | "Sistem";

interface DbNotification {
    id: string;
    type: string;
    is_unread: boolean;
    created_at: string;
    content: string;
    target_title: string | null;
    target_id: string | null;
    actor_id: string | null;
}

// Mapped object to match the UI expectations
interface Notification {
    id: string;
    type: "like" | "comment" | "connection" | "system";
    isUnread: boolean;
    createdAt: string;
    actor: {
        name: string;
        avatar?: string;
    };
    content: string;
    targetTitle?: string;
}

const TABS: TabType[] = ["Tümü", "Beğeniler", "Yorumlar", "Bağlantı İstekleri", "Sistem"];

export default function NotificationsPage() {
    const supabase = createClient();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>("Tümü");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            setIsLoading(true);
            try {
                const { data: userData, error: userError } = await supabase.auth.getUser();
                if (userError || !userData?.user) throw new Error("Kullanıcı bulunamadı");

                const { data: alertsData, error: alertsError } = await supabase
                    .from("notifications")
                    .select(`
                        *,
                        profiles!notifications_actor_id_fkey(full_name, avatar_url)
                    `)
                    .eq("user_id", userData.user.id)
                    .order("created_at", { ascending: false });

                if (alertsError) throw alertsError;

                const mappedNotifications: Notification[] = (alertsData || []).map((dbItem: any) => ({
                    id: dbItem.id,
                    type: dbItem.type as any,
                    isUnread: dbItem.is_unread,
                    createdAt: dbItem.created_at,
                    content: dbItem.content,
                    targetTitle: dbItem.target_title || undefined,
                    actor: {
                        name: dbItem.profiles?.full_name || "Bilinmeyen Kullanıcı",
                        avatar: dbItem.profiles?.avatar_url || undefined,
                    }
                }));

                setNotifications(mappedNotifications);
            } catch (error) {
                console.error("Bildirimler yüklenirken hata oluştu:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNotifications();
    }, []);

    const unreadCount = notifications.filter(n => n.isUnread).length;

    const markAllAsRead = async () => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if(!userData?.user) return;

            setNotifications(notifications.map(n => ({ ...n, isUnread: false })));
            await supabase
                .from("notifications")
                .update({ is_unread: false })
                .eq("user_id", userData.user.id)
                .eq("is_unread", true);
        } catch (error) {
            console.error("Okundu işaretleme hatası:", error);
        }
    };

    const clearAll = async () => {
        if (confirm("Tüm bildirimleri silmek istediğinize emin misiniz?")) {
            try {
                const { data: userData } = await supabase.auth.getUser();
                if(!userData?.user) return;

                setNotifications([]);
                await supabase
                    .from("notifications")
                    .delete()
                    .eq("user_id", userData.user.id);
            } catch (error) {
                console.error("Silme hatası:", error);
            }
        }
    };

    const markAsRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            setNotifications(notifications.map(n => n.id === id ? { ...n, isUnread: false } : n));
            await supabase
                .from("notifications")
                .update({ is_unread: false })
                .eq("id", id);
        } catch (error) {
             console.error("Okundu işaretleme hatası:", error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "like": return <Heart className="h-2.5 w-2.5 fill-rose-500 text-rose-500" />;
            case "comment": return <MessageSquare className="h-2.5 w-2.5 fill-blue-500 text-blue-500" />;
            case "connection": return <UserPlus className="h-2.5 w-2.5 text-emerald-500" />;
            case "system": return <Bell className="h-4 w-4 fill-amber-500 text-amber-500" />; 
            default: return <Bell className="h-4 w-4 fill-amber-500 text-amber-500" />;
        }
    };

    const getIconWrapperColor = (type: string) => {
        switch (type) {
            case "like": return "bg-rose-50 border-rose-100";
            case "comment": return "bg-blue-50 border-blue-100";
            case "connection": return "bg-emerald-50 border-emerald-100";
            case "system": return "bg-amber-100 border-amber-200";
            default: return "bg-amber-100 border-amber-200";
        }
    };

    // Filter Notifications
    const filteredNotifications = notifications.filter(n => {
        switch (activeTab) {
            case "Beğeniler": return n.type === "like";
            case "Yorumlar": return n.type === "comment";
            case "Bağlantı İstekleri": return n.type === "connection";
            case "Sistem": return n.type === "system";
            default: return true;
        }
    });

    // Group Notifications by Date
    const groupedNotifications = filteredNotifications.reduce((acc, notification) => {
        const date = new Date(notification.createdAt);
        let group = "ÖNCEKİLER";
        
        if (isToday(date)) {
            group = "BUGÜN";
        } else if (isYesterday(date)) {
            group = "DÜN";
        }

        if (!acc[group]) {
            acc[group] = [];
        }
        acc[group].push(notification);
        return acc;
    }, {} as Record<string, Notification[]>);

    // Ensure order: BUGÜN, DÜN, ÖNCEKİLER
    const groupOrder = ["BUGÜN", "DÜN", "ÖNCEKİLER"];

    return (
        <AppShell fullWidth={false}>
            <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 mb-20 md:mb-0">

                {/* Header & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-end w-full border-b border-gray-100 pb-4 mb-6">
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                            Ruhefza Bildirim Merkezi
                        </h1>
                        
                        {/* Tabs */}
                        <div className="flex items-center gap-6 mt-6 md:mt-8 overflow-x-auto no-scrollbar">
                            {TABS.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={cn(
                                        "text-sm font-medium pb-2 transition-colors relative whitespace-nowrap",
                                        activeTab === tab 
                                            ? "text-[#0c9789]" 
                                            : "text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    {tab}
                                    {activeTab === tab && (
                                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0c9789] rounded-t-full" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 self-end mt-4 sm:mt-0 pb-2">
                        <button
                            onClick={clearAll}
                            disabled={notifications.length === 0 || isLoading}
                            className="text-sm font-medium text-gray-500 hover:text-red-600 disabled:opacity-50 transition-colors"
                        >
                            Temizle
                        </button>
                        <button
                            onClick={markAllAsRead}
                            disabled={unreadCount === 0 || isLoading}
                            className="text-sm font-medium text-[#0c9789] hover:text-[#0a8074] disabled:opacity-50 transition-colors"
                        >
                            Tümünü Okundu İşaretle
                        </button>
                    </div>
                </div>

                {/* Notifications List */}
                <div className="flex flex-col gap-6">
                    {isLoading ? (
                        <div className="py-16 text-center text-gray-400">Yükleniyor...</div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="py-16 text-center flex flex-col items-center justify-center">
                            <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <Bell className="h-10 w-10 text-gray-300" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Bildirim Yok</h3>
                            <p className="text-gray-500">Bu kategoride henüz bir bildiriminiz bulunmuyor.</p>
                        </div>
                    ) : (
                        groupOrder.map((groupTitle) => {
                            const groupItem = groupedNotifications[groupTitle];
                            if (!groupItem || groupItem.length === 0) return null;

                            return (
                                <div key={groupTitle} className="flex flex-col gap-0">
                                    <h3 className="text-xs font-bold text-gray-500 tracking-wider mb-2 ml-4">
                                        {groupTitle}
                                    </h3>
                                    
                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                                        {groupItem.map((notification) => (
                                            <div
                                                key={notification.id}
                                                className={cn(
                                                    "p-4 sm:p-5 flex gap-4 transition-colors hover:bg-gray-50 cursor-pointer items-start border-b border-gray-50/80 last:border-0",
                                                    notification.isUnread ? "bg-[#0c9789]/[0.02]" : ""
                                                )}
                                                onClick={(e) => {
                                                    if(notification.isUnread) markAsRead(notification.id, e);
                                                }}
                                            >
                                                {/* Left side: Avatar/Icon */}
                                                <div className="relative shrink-0 mt-0.5">
                                                    {notification.type === "system" ? ( 
                                                        <div className="h-11 w-11 rounded-full bg-amber-100 flex items-center justify-center border border-amber-200">
                                                            <Bell className="h-5 w-5 fill-amber-500 text-amber-500" />
                                                        </div>
                                                    ) : (
                                                        <Avatar className="h-11 w-11 shadow-sm">
                                                            <AvatarImage src={notification.actor.avatar} />
                                                            <AvatarFallback className="bg-gray-100 text-gray-600 font-medium">
                                                                {notification.actor.name.charAt(0)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    )}
                                                    
                                                    {/* Small status icon overlaid on avatar */}
                                                    {notification.type !== "system" && (
                                                        <div className={cn(
                                                            "absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white flex items-center justify-center shadow-sm",
                                                            getIconWrapperColor(notification.type)
                                                        )}>
                                                            {getIcon(notification.type)}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Middle: Content */}
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <p className="text-[14px] text-gray-700 leading-normal">
                                                        <span className="font-bold text-gray-900">{notification.actor.name}</span>
                                                        {" "}
                                                        {notification.content}
                                                        {notification.targetTitle && (
                                                            <span> "{notification.targetTitle}"</span>
                                                        )}
                                                    </p>

                                                    <div className="mt-1 text-xs font-medium text-[#0c9789]/80">
                                                        {notification.type === "system" 
                                                            ? `${isYesterday(new Date(notification.createdAt)) ? 'Dün' : 'Önceki'}, ${new Date(notification.createdAt).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}` 
                                                            : formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: tr })
                                                        }
                                                    </div>
                                                </div>

                                                {/* Right side: Action / Unread Indicator */}
                                                <div className="shrink-0 flex items-center gap-3 pt-1">
                                                    {notification.type === "connection" && (
                                                        <Button 
                                                            size="sm" 
                                                            className="bg-[#0c9789] hover:bg-[#0a8074] text-white rounded-full px-5 h-8 text-xs font-medium"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                alert(`İstek görüntülendi: ${notification.actor.name}`);
                                                            }}
                                                        >
                                                            İsteği Gör
                                                        </Button>
                                                    )}
                                                    
                                                    {/* Unread dot */}
                                                    {notification.isUnread && (
                                                        <div className="h-2 w-2 rounded-full bg-[#0c9789] ml-1"></div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </AppShell>
    );
}

