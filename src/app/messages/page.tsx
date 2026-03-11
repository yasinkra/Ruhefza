"use client";

import { useState, useEffect, Suspense } from "react";
import { ChatList } from "@/components/chat/ChatList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { AppShell } from "@/components/layout/AppShell";
import { cn } from "@/utils/cn";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";

function MessagesContent() {
    const searchParams = useSearchParams();
    const paramUserId = searchParams.get("userId");

    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(paramUserId);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Track online users via Supabase Presence
    const { isOnline } = useOnlinePresence(currentUserId);

    useEffect(() => {
        createClient().auth.getUser().then(({ data }) => {
            if (data.user) setCurrentUserId(data.user.id);
        });
    }, []);

    // If arriving from a profile/post with userId param, auto-find or create conversation
    useEffect(() => {
        if (!paramUserId || !currentUserId) return;
        const initConversation = async () => {
            const { data: convId } = await createClient().rpc("get_or_create_conversation", {
                user_a: currentUserId,
                user_b: paramUserId
            });
            if (convId) {
                setSelectedConversationId(convId);
                setSelectedPartnerId(paramUserId);
            }
        };
        initConversation();
    }, [paramUserId, currentUserId]);

    const handleSelectConversation = (conversationId: string, partnerId: string) => {
        setSelectedConversationId(conversationId);
        setSelectedPartnerId(partnerId);
    };

    return (
        <div className="flex flex-1 h-full overflow-hidden">
            {/* Chat List */}
            <div className={cn(
                "w-full md:w-80 border-r border-gray-200 h-full shrink-0",
                selectedConversationId ? "hidden md:block" : "block"
            )}>
                <ChatList
                    onSelectConversation={handleSelectConversation}
                    selectedConversationId={selectedConversationId}
                    isOnline={isOnline}
                />
            </div>

            {/* Chat Window */}
            <div className={cn(
                "flex-1 h-full",
                !selectedConversationId ? "hidden md:flex" : "block"
            )}>
                {selectedConversationId && selectedPartnerId ? (
                    <ChatWindow
                        conversationId={selectedConversationId}
                        partnerId={selectedPartnerId}
                        onBack={() => { setSelectedConversationId(null); setSelectedPartnerId(null); }}
                        isOnline={isOnline}
                    />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 p-4 text-center bg-gray-50/50">
                        <div className="w-20 h-20 bg-gradient-to-br from-[#f0fdfa] to-[#ccfbf1] rounded-3xl flex items-center justify-center mb-6 shadow-[inset_0_2px_10px_rgb(0,0,0,0.02)]">
                            <svg className="w-9 h-9 text-[#0c9789]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">Mesajlarınız</h3>
                        <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                            Soldaki listeden bir sohbet seçin veya yeni biri ile bağlantı kurarak mesajlaşmaya başlayın.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function MessagesPage() {
    return (
        <AppShell fullWidth={true}>
            <Suspense fallback={<div className="flex flex-1 h-full items-center justify-center text-gray-400">Yükleniyor...</div>}>
                <MessagesContent />
            </Suspense>
        </AppShell>
    );
}
