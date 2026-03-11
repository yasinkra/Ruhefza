"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

/**
 * Hook that tracks online users via Supabase Realtime Presence.
 * - Broadcasts current user's presence to the "online-users" channel
 * - Listens for other users' presence events
 * - Returns a Set of online user IDs
 */
export function useOnlinePresence(currentUserId: string | null) {
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!currentUserId) return;

        const supabase = createClient();
        const channel = supabase.channel("online-users", {
            config: {
                presence: {
                    key: currentUserId,
                },
            },
        });

        channel
            .on("presence", { event: "sync" }, () => {
                const state = channel.presenceState();
                const userIds = new Set<string>();
                for (const key of Object.keys(state)) {
                    userIds.add(key);
                }
                setOnlineUsers(userIds);
            })
            .subscribe(async (status) => {
                if (status === "SUBSCRIBED") {
                    await channel.track({
                        user_id: currentUserId,
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUserId]);

    const isOnline = useCallback(
        (userId: string) => onlineUsers.has(userId),
        [onlineUsers]
    );

    return { onlineUsers, isOnline };
}
