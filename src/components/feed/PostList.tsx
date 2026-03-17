"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { PostItem } from "./PostItem";
import { BookOpen } from "lucide-react";

interface Post {
    id: string;
    content: string;
    is_anonymous: boolean;
    likes_count: number;
    comments_count?: number;
    created_at: string;
    user_has_liked?: boolean;
    user_has_bookmarked?: boolean;
    author_id: string;
    profiles: {
        id: string;
        full_name: string;
        avatar_url: string | null;
        is_verified_expert?: boolean;
    } | null;
}

export function PostList({
    refreshTrigger,
    categoryFilter,
    searchQuery = "",
    sortOption = "recent",
    activeTab = "discover"
}: {
    refreshTrigger: number;
    categoryFilter?: string | null;
    searchQuery?: string;
    sortOption?: string;
    activeTab?: 'discover' | 'following';
}) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        createClient().auth.getUser().then(({ data }) => {
            setUserId(data.user?.id || null);
            if (data.user?.id) {
                createClient().from('profiles').select('is_admin').eq('id', data.user.id).single()
                    .then(({ data: p }) => setIsAdmin(!!p?.is_admin));
            }
        });
    }, []);

    useEffect(() => {
        const fetchPosts = async () => {
            setLoading(true);

            let connectionIds: string[] = [];
            
            // If Following tab is selected, fetch connected user IDs
            if (activeTab === 'following' && userId) {
                const { data: connections } = await createClient()
                    .from("connection_requests")
                    .select("sender_id, receiver_id")
                    .eq("status", "accepted")
                    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
                
                if (connections) {
                    connectionIds = connections.map(c => 
                        c.sender_id === userId ? c.receiver_id : c.sender_id
                    );
                }
                
                // If no connections, and in following tab, we can show empty early
                if (connectionIds.length === 0) {
                    setPosts([]);
                    setLoading(false);
                    return;
                }
            }

            let query = createClient()
                .from("posts")
                .select(`
                    id,
                    content,
                    is_anonymous,
                    likes_count,
                    comments_count,
                    created_at,
                    category,
                    image_url,
                    author_id,
                    profiles!posts_author_id_fkey (
                        id,
                        full_name,
                        avatar_url,
                        is_verified_expert,
                        role
                    )
                `);

            // Apply Tab Filter (Following)
            if (activeTab === 'following' && connectionIds.length > 0) {
                query = query.in('author_id', connectionIds);
            }

            // Apply Sort
            if (sortOption === "popular") {
                query = query.order("likes_count", { ascending: false }).order("created_at", { ascending: false });
            } else {
                query = query.order("created_at", { ascending: false });
            }

            // Apply Category Filter
            if (categoryFilter) {
                query = query.eq('category', categoryFilter);
            }

            // Apply Text Search
            if (searchQuery && searchQuery.trim().length > 0) {
                query = query.ilike('content', `%${searchQuery.trim()}%`);
            }

            const { data: postsData, error: postsError } = await query;

            if (postsError) {
                console.error("Error fetching posts:", postsError);
                setLoading(false);
                return;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let mappedPosts = postsData?.map((post: any) => ({
                ...post,
                profiles: Array.isArray(post.profiles) ? post.profiles[0] : post.profiles,
                author_id: post.author_id
            })) as Post[];

            if (userId && mappedPosts.length > 0) {
                const { data: likesData } = await createClient()
                    .from("post_likes")
                    .select("post_id")
                    .eq("user_id", userId);

                const { data: bookmarksData } = await createClient()
                    .from("bookmarks")
                    .select("item_id")
                    .eq("user_id", userId)
                    .eq("item_type", "post");

                const likedPostIds = new Set(likesData?.map(l => l.post_id));
                const bookmarkedPostIds = new Set(bookmarksData?.map(b => b.item_id));

                mappedPosts = mappedPosts.map((post) => ({
                    ...post,
                    user_has_liked: likedPostIds.has(post.id),
                    user_has_bookmarked: bookmarkedPostIds.has(post.id)
                }));
            }

            setPosts(mappedPosts || []);
            setLoading(false);
        };

        fetchPosts();
    }, [refreshTrigger, userId, categoryFilter, searchQuery, sortOption, activeTab]);

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white border border-stone-100 rounded-2xl p-5 shadow-sm">
                        <div className="flex gap-3 items-center mb-4">
                            <div className="w-10 h-10 rounded-full bg-stone-100 animate-pulse" />
                            <div className="space-y-2">
                                <div className="h-3 w-32 bg-stone-100 rounded animate-pulse" />
                                <div className="h-2 w-20 bg-stone-50 rounded animate-pulse" />
                            </div>
                        </div>
                        <div className="space-y-2.5 mb-5">
                            <div className="h-3 w-full bg-stone-50 rounded animate-pulse" />
                            <div className="h-3 w-5/6 bg-stone-50 rounded animate-pulse" />
                            <div className="h-3 w-4/6 bg-stone-50 rounded animate-pulse" />
                        </div>
                        <div className="flex gap-3 pt-4 border-t border-stone-50">
                            <div className="h-8 w-20 bg-stone-50 rounded-xl animate-pulse" />
                            <div className="h-8 w-24 bg-stone-50 rounded-xl animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="text-center py-16 px-4 bg-white border border-stone-100 rounded-[28px] shadow-sm">
                <div className="bg-stone-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-stone-300" />
                </div>
                <h3 className="text-gray-900 font-bold mb-2">Henüz içerik yok</h3>
                <p className="text-stone-500 text-sm max-w-[240px] mx-auto leading-relaxed">
                    {activeTab === 'following' 
                        ? "Bağlantıların henüz bir şey paylaşmamış veya henüz kimseyle bağlantı kurmamışsın." 
                        : "Henüz hiç gönderi yok. İlk paylaşan siz olun!"}
                </p>
                {activeTab === 'following' && (
                    <button 
                        onClick={() => window.location.href = '/experts'}
                        className="mt-6 text-[#0c9789] text-sm font-bold hover:underline"
                    >
                        Uzmanları Keşfet →
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {posts.map((post) => (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                <PostItem key={post.id} post={post as any} currentUserId={userId} isAdmin={isAdmin} onDelete={(id) => {
                    setPosts(prev => prev.filter(p => p.id !== id));
                }} />
            ))}
        </div>
    );
}
