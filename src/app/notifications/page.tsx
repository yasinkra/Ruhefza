"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Bell, Heart, MessageSquare, UserPlus, Check, Trash2, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

// Mock Notification Type
type NotificationType = "like" | "comment" | "follow" | "system";

interface Notification {
    id: string;
    type: NotificationType;
    isUnread: boolean;
    createdAt: string;
    actor: {
        name: string;
        avatar?: string;
    };
    content: string;
    targetTitle?: string;
}

// Mock Data
const MOCK_NOTIFICATIONS: Notification[] = [
    {
        id: "1",
        type: "like",
        isUnread: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
        actor: { name: "Ayşe Yılmaz", avatar: "https://i.pravatar.cc/150?u=ayse" },
        content: "gönderini beğendi.",
        targetTitle: "DEHB ile başa çıkma stratejileri üzerine harika bir kaynak k...",
    },
    {
        id: "2",
        type: "comment",
        isUnread: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
        actor: { name: "Mehmet Demir" },
        content: "makalene yorum yaptı:",
        targetTitle: "Bu gerçekten çok faydalı oldu, deneyeceğim!",
    },
    {
        id: "3",
        type: "follow",
        isUnread: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        actor: { name: "Zeynep Kaya", avatar: "https://i.pravatar.cc/150?u=zeynep" },
        content: "seni takip etmeye başladı.",
    },
    {
        id: "4",
        type: "system",
        isUnread: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
        actor: { name: "Ruhefza App" },
        content: "Yeni Otizm rehberi kütüphaneye eklendi! Hemen incele.",
    },
];

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

    const unreadCount = notifications.filter(n => n.isUnread).length;

    const markAllAsRead = () => {
        setNotifications(notifications.map(n => ({ ...n, isUnread: false })));
    };

    const clearAll = () => {
        if (confirm("Tüm bildirimleri silmek istediğinize emin misiniz?")) {
            setNotifications([]);
        }
    };

    const markAsRead = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setNotifications(notifications.map(n => n.id === id ? { ...n, isUnread: false } : n));
    };

    const getIcon = (type: NotificationType) => {
        switch (type) {
            case "like": return <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />;
            case "comment": return <MessageSquare className="h-4 w-4 fill-blue-500 text-blue-500" />;
            case "follow": return <UserPlus className="h-4 w-4 text-emerald-500" />;
            case "system": return <Bell className="h-4 w-4 fill-amber-500 text-amber-500" />;
        }
    };

    const getIconWrapperColor = (type: NotificationType) => {
        switch (type) {
            case "like": return "bg-rose-100 border-rose-200";
            case "comment": return "bg-blue-100 border-blue-200";
            case "follow": return "bg-emerald-100 border-emerald-200";
            case "system": return "bg-amber-100 border-amber-200";
        }
    };

    return (
        <AppShell fullWidth={false}>
            <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 mb-20 md:mb-0">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight flex items-center gap-3">
                            <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Bell className="h-6 w-6" />
                            </span>
                            Bildirimler
                            {unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                                    {unreadCount} yeni
                                </span>
                            )}
                        </h1>
                        <p className="text-stone-500 text-sm mt-2 ml-14">Son etkileşimlerinizi buradan takip edebilirsiniz.</p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={markAllAsRead}
                            disabled={unreadCount === 0}
                            className="text-stone-600 hover:text-teal-600 border-stone-200 rounded-xl"
                        >
                            <Check className="h-4 w-4 mr-1.5" /> Tümü Okundu
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={clearAll}
                            disabled={notifications.length === 0}
                            className="text-stone-600 hover:text-red-500 border-stone-200 rounded-xl"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Notifications List */}
                <div className="bg-white rounded-[32px] border border-stone-100 shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden flex flex-col gap-px bg-stone-50">
                    {notifications.length === 0 ? (
                        <div className="bg-white py-16 px-6 text-center flex flex-col items-center justify-center">
                            <div className="h-20 w-20 bg-stone-50 rounded-full flex items-center justify-center mb-4">
                                <Bell className="h-10 w-10 text-stone-300" />
                            </div>
                            <h3 className="text-xl font-bold text-stone-800 mb-2">Bildirim Yok</h3>
                            <p className="text-stone-500 max-w-sm">Şu an için gösterilecek yeni bir bildiriminiz bulunmuyor.</p>
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={cn(
                                    "bg-white p-4 sm:p-5 flex gap-4 transition-colors hover:bg-stone-50 cursor-pointer group relative",
                                    notification.isUnread ? "bg-[#0D9488]/5" : ""
                                )}
                            >
                                {/* Unread indicator line */}
                                {notification.isUnread && (
                                    <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-[#0D9488] rounded-r-md"></div>
                                )}

                                <div className="relative shrink-0 mt-1">
                                    {notification.type === "system" ? (
                                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center text-white font-bold shadow-md">
                                            R
                                        </div>
                                    ) : (
                                        <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                            <AvatarImage src={notification.actor.avatar} />
                                            <AvatarFallback className="bg-stone-100 text-stone-600 font-medium">
                                                {notification.actor.name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div className={cn(
                                        "absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-2 border-white flex items-center justify-center shadow-sm",
                                        getIconWrapperColor(notification.type)
                                    )}>
                                        {getIcon(notification.type)}
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0 pt-1">
                                    <p className="text-[15px] text-stone-700 leading-snug">
                                        <span className="font-bold text-stone-900">{notification.actor.name}</span>
                                        {" "}
                                        {notification.content}
                                    </p>

                                    {notification.targetTitle && (
                                        <div className={cn(
                                            "mt-2 mb-1 p-3 rounded-xl text-sm border",
                                            notification.type === "comment"
                                                ? "bg-stone-50 border-stone-200 italic text-stone-600"
                                                : "bg-white border-stone-100 text-stone-500 font-medium shadow-sm"
                                        )}>
                                            {notification.type === "comment" ? `"${notification.targetTitle}"` : notification.targetTitle}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-stone-400">
                                        <Calendar className="h-3 w-3" />
                                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: tr })}
                                    </div>
                                </div>

                                {/* Read toggle bubble */}
                                {notification.isUnread && (
                                    <button
                                        className="shrink-0 h-3 w-3 rounded-full bg-[#0D9488] opacity-60 hover:opacity-100 transition-opacity self-center sm:self-start mt-2 mr-2 shadow-sm"
                                        title="Okundu olarak işaretle"
                                        onClick={(e) => markAsRead(notification.id, e)}
                                    ></button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </AppShell>
    );
}
