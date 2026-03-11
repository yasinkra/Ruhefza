"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { PostItem } from "./PostItem";

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
    sortOption = "recent"
}: {
    refreshTrigger: number;
    categoryFilter?: string | null;
    searchQuery?: string;
    sortOption?: string;
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
    }, [refreshTrigger, userId, categoryFilter, searchQuery, sortOption]);

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
        return <div className="text-center py-10 text-stone-500">Henüz hiç gönderi yok. İlk paylaşan siz olun!</div>;
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
