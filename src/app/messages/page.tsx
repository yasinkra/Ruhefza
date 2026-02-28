"use client";

import { useState, useEffect, Suspense } from "react";
import { ChatList } from "@/components/chat/ChatList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { AppShell } from "@/components/layout/AppShell";
import { cn } from "@/utils/cn";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

function MessagesContent() {
    const searchParams = useSearchParams();
    const paramUserId = searchParams.get("userId");

    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(paramUserId);

    // If arriving from a profile/post with userId param, auto-find or create conversation
    useEffect(() => {
        if (!paramUserId) return;
        const initConversation = async () => {
            const { data: { user } } = await createClient().auth.getUser();
            if (!user) return;

            // Check if there's already an accepted connection and conversation
            const { data: convId } = await createClient().rpc("get_or_create_conversation", {
                user_a: user.id,
                user_b: paramUserId
            });
            if (convId) {
                setSelectedConversationId(convId);
                setSelectedPartnerId(paramUserId);
            }
        };
        initConversation();
    }, [paramUserId]);

    const handleSelectConversation = (conversationId: string, partnerId: string) => {
        setSelectedConversationId(conversationId);
        setSelectedPartnerId(partnerId);
    };

    return (
        <div className="flex flex-1 h-full overflow-hidden">
            {/* Chat List */}
            <div className={cn(
                "w-full md:w-80 border-r border-stone-200 h-full shrink-0",
                selectedConversationId ? "hidden md:block" : "block"
            )}>
                <ChatList
                    onSelectConversation={handleSelectConversation}
                    selectedConversationId={selectedConversationId}
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
                    />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-stone-400 p-4 text-center bg-stone-50/30">
                        <div className="w-20 h-20 bg-gradient-to-br from-teal-100 to-indigo-100 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                            <svg className="w-9 h-9 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-stone-600 mb-2">Mesajlarınız</h3>
                        <p className="text-sm text-stone-400 max-w-xs leading-relaxed">
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
            <Suspense fallback={<div className="flex flex-1 h-full items-center justify-center text-stone-400">Yükleniyor...</div>}>
                <MessagesContent />
            </Suspense>
        </AppShell>
    );
}
