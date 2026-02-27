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
        return <div className="text-center py-10 text-slate-400">Yükleniyor...</div>;
    }

    if (posts.length === 0) {
        return <div className="text-center py-10 text-slate-500">Henüz hiç gönderi yok. İlk paylaşan siz olun!</div>;
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
