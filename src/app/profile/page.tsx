"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { cn } from "@/utils/cn";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, Loader2, LogOut, Save, Copy, Check, X, Edit2, Instagram, Twitter, Facebook, Globe, Music, ExternalLink, Bookmark, FileText, Clock } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostItem } from "@/components/feed/PostItem";
import { VerificationStatus } from "@/components/profile/VerificationStatus";
import { PortfolioTab } from "@/components/profile/PortfolioTab";

interface Profile {
    id: string;
    custom_id: number;
    username: string | null;
    username_last_changed: string | null;
    full_name: string;
    avatar_url: string | null;
    is_admin?: boolean;
    role: 'parent' | 'teacher' | 'student' | null;
    verification_status: 'none' | 'unverified' | 'pending' | 'approved';
    bio: string | null;
    special_note: string | null;
    created_at: string;
    social_links: {
        instagram?: string;
        twitter?: string;
        facebook?: string;
        spotify?: string;
        website?: string;
    } | null;
    email?: string | null;
}

export default function ProfilePage() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [bookmarkedPosts, setBookmarkedPosts] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [bookmarkedArticles, setBookmarkedArticles] = useState<any[]>([]);
    const [loadingBookmarks, setLoadingBookmarks] = useState(false);

    // Stats state
    const [stats, setStats] = useState({
        posts: 0,
        articles: 0,
        connections: 0
    });

    // Username specific state
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [usernameInput, setUsernameInput] = useState("");
    const [usernameLoading, setUsernameLoading] = useState(false);

    // General Form state
    const [formData, setFormData] = useState<Partial<Profile>>({});

    // Ensure social links form data structure
    const getSocialLinks = (profileData: Partial<Profile>) => {
        return {
            instagram: profileData.social_links?.instagram || "",
            twitter: profileData.social_links?.twitter || "",
            facebook: profileData.social_links?.facebook || "",
            spotify: profileData.social_links?.spotify || "",
            website: profileData.social_links?.website || "",
        };
    };

    // Faceless, minimalist human avatars for all users
    const NEUTRAL_AVATARS = [
        "https://api.dicebear.com/9.x/notionists/svg?seed=Felix&eyes=&lips=&nose=&brows=&beard=&glasses=&gesture=&bodyIcon=",
        "https://api.dicebear.com/9.x/notionists/svg?seed=Anita&eyes=&lips=&nose=&brows=&beard=&glasses=&gesture=&bodyIcon=",
        "https://api.dicebear.com/9.x/notionists/svg?seed=Oliver&eyes=&lips=&nose=&brows=&beard=&glasses=&gesture=&bodyIcon=",
        "https://api.dicebear.com/9.x/notionists/svg?seed=Maya&eyes=&lips=&nose=&brows=&beard=&glasses=&gesture=&bodyIcon=",
        "https://api.dicebear.com/9.x/notionists/svg?seed=Leo&eyes=&lips=&nose=&brows=&beard=&glasses=&gesture=&bodyIcon=",
        "https://api.dicebear.com/9.x/notionists/svg?seed=Bella&eyes=&lips=&nose=&brows=&beard=&glasses=&gesture=&bodyIcon=",
        "https://api.dicebear.com/9.x/notionists/svg?seed=Jack&eyes=&lips=&nose=&brows=&beard=&glasses=&gesture=&bodyIcon=",
        "https://api.dicebear.com/9.x/notionists/svg?seed=Nora&eyes=&lips=&nose=&brows=&beard=&glasses=&gesture=&bodyIcon="
    ];

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await createClient().auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }

            const { data, error } = await createClient()
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            if (data) {
                setProfile(data);
                setFormData(data);
                setUsernameInput(data.username || "");
            } else if (error) {
                console.error("Error fetching profile:", error);
            }

            setLoading(false);
        };

        const fetchBookmarks = async () => {
            const { data: { user } } = await createClient().auth.getUser();
            if (!user) return;

            setLoadingBookmarks(true);

            // Step 1: Get post bookmark IDs
            const { data: postBookmarks } = await createClient()
                .from("bookmarks")
                .select("item_id, created_at")
                .eq("user_id", user.id)
                .eq("item_type", "post")
                .order("created_at", { ascending: false });

            if (postBookmarks && postBookmarks.length > 0) {
                const postIds = postBookmarks.map((b: { item_id: string }) => b.item_id);

                const { data: postsData } = await createClient()
                    .from("posts")
                    .select(`
                        id, content, is_anonymous, likes_count, comments_count, created_at,
                        category, image_url, author_id,
                        profiles!posts_author_id_fkey (
                            id, full_name, avatar_url, is_verified_expert
                        )
                    `)
                    .in("id", postIds);

                if (postsData) {
                    const { data: likesData } = await createClient()
                        .from("post_likes")
                        .select("post_id")
                        .eq("user_id", user.id)
                        .in("post_id", postIds);

                    const likedPostIds = new Set(likesData?.map((l: { post_id: string }) => l.post_id) || []);

                    const ordered = postIds
                        .map((id: string) => postsData.find((p: any) => p.id === id))
                        .filter(Boolean)
                        .map((p: any) => ({
                            ...p,
                            profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
                            user_has_bookmarked: true,
                            user_has_liked: likedPostIds.has(p.id),
                        }));

                    setBookmarkedPosts(ordered);
                }
            } else {
                setBookmarkedPosts([]);
            }

            // Step 1b: Get article bookmark IDs
            const { data: artBookmarks } = await createClient()
                .from("bookmarks")
                .select("item_id, created_at")
                .eq("user_id", user.id)
                .eq("item_type", "article")
                .order("created_at", { ascending: false });

            if (artBookmarks && artBookmarks.length > 0) {
                const articleIds = artBookmarks.map((b: { item_id: string }) => b.item_id);

                const { data: articlesData } = await createClient()
                    .from("articles")
                    .select(`
                        id, title, summary, category, created_at, author_id,
                        author:author_id ( full_name, avatar_url )
                    `)
                    .in("id", articleIds);

                if (articlesData) {
                    const ordered = articleIds
                        .map((id: string) => articlesData.find((a: any) => a.id === id))
                        .filter(Boolean)
                        .map((a: any) => ({
                            ...a,
                            author: Array.isArray(a.author) ? a.author[0] : a.author,
                        }));

                    setBookmarkedArticles(ordered);
                }
            } else {
                setBookmarkedArticles([]);
            }

            setLoadingBookmarks(false);
        };

        const fetchStats = async () => {
            const { data: { user } } = await createClient().auth.getUser();
            if (!user) return;

            // Fetch post count
            const { count: postsCount } = await createClient()
                .from("posts")
                .select("*", { count: 'exact', head: true })
                .eq("author_id", user.id);

            // Fetch article count
            const { count: articlesCount } = await createClient()
                .from("articles")
                .select("*", { count: 'exact', head: true })
                .eq("author_id", user.id);

            // Fetch connection count
            const { count: connectionsCount } = await createClient()
                .from("connection_requests")
                .select("*", { count: 'exact', head: true })
                .eq("status", "accepted")
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

            setStats({
                posts: postsCount || 0,
                articles: articlesCount || 0,
                connections: connectionsCount || 0
            });
        };

        fetchProfile();
        fetchBookmarks();
        fetchStats();
    }, [router]);

    const handleSave = async () => {
        if (!profile) return;
        setSaving(true);

        try {
            const { error } = await createClient()
                .from("profiles")
                .update({
                    full_name: formData.full_name,
                    bio: formData.bio,
                    special_note: formData.special_note,
                    avatar_url: formData.avatar_url,
                    social_links: formData.social_links
                })
                .eq("id", profile.id);

            if (error) throw error;

            setProfile({ ...profile, ...formData } as Profile);
            setIsEditing(false);
            toast.success("Profil bilgileri başarıyla güncellendi!");
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Güncelleme sırasında bir hata oluştu: " + (error as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const handleUsernameUpdate = async () => {
        if (!profile || !usernameInput.trim()) return;

        if (usernameInput.length < 3) {
            toast.warning("Kullanıcı adı en az 3 karakter olmalıdır.");
            return;
        }

        if (usernameInput === profile.username) {
            setIsEditingUsername(false);
            return;
        }

        setUsernameLoading(true);

        try {
            const { data, error } = await createClient().rpc('update_username', {
                new_username: usernameInput,
                user_id: profile.id
            });

            if (error) throw error;

            if (data.success) {
                toast.success(data.message);
                setProfile({ ...profile, username: usernameInput } as Profile);
                setIsEditingUsername(false);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("Error updating username:", error);
            toast.error("Hata: " + (error as Error).message);
        } finally {
            setUsernameLoading(false);
        }
    };


    const handleLogout = async () => {
        await createClient().auth.signOut();
        router.push("/login");
    };

    const canChangeUsername = () => {
        if (!profile?.username_last_changed) return true;
        const lastChanged = new Date(profile.username_last_changed);
        const nextChange = new Date(lastChanged);
        nextChange.setMonth(nextChange.getMonth() + 1);
        return new Date() > nextChange;
    };

    const updateSocialLink = (platform: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            social_links: {
                ...prev.social_links,
                [platform]: value
            }
        }));
    };

    if (loading) {
        return (
            <AppShell fullWidth={true}>
                <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#0c9789]" />
                </div>
            </AppShell>
        );
    }

    if (!profile) return null;

    return (
        <AppShell fullWidth={true}>
            <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-20 py-8 pb-32">
                {/* Header Title */}
                <div className="flex justify-between items-center mb-10">
                    <h1 className="text-3xl font-black text-gray-800 tracking-tight">Profilim</h1>
                </div>

                {/* Profile Header Card */}
                <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden mb-8">
                    {/* Banner/Cover area */}
                    <div className="h-48 bg-[#F0FDFA] relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#14B8A6]/5 to-transparent"></div>
                        
                        {/* Avatar (Overlapping) */}
                        <div className="absolute -bottom-16 left-8">
                            <div className="relative">
                                <Avatar className="h-32 w-32 border-[4px] border-white shadow-lg bg-white">
                                    <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
                                    <AvatarFallback className="text-3xl font-bold bg-gray-50 text-gray-300">
                                        {profile.full_name?.[0]}
                                    </AvatarFallback>
                                </Avatar>
                                {profile.verification_status === 'approved' && (
                                    <div className="absolute bottom-2 right-2 bg-white rounded-full p-1 shadow-md">
                                        <ShieldCheck className="w-5 h-5 text-[#14B8A6]" fill="currentColor" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Top Actions */}
                        <div className="absolute top-6 right-8 flex gap-3">
                            <Button
                                onClick={() => setIsEditing(true)}
                                className="bg-white hover:bg-gray-50 text-gray-600 rounded-2xl px-6 h-12 font-bold border border-gray-200 shadow-sm transition-all hover:-translate-y-1"
                            >
                                <Edit2 className="h-4 w-4 mr-2 text-[#0c9789]" /> Profili Düzenle
                            </Button>
                            <Button
                                variant="outline"
                                className="bg-white hover:bg-gray-50 text-gray-400 h-10 w-10 p-0 rounded-xl border border-gray-100 shadow-sm"
                            >
                                <Globe className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Profile Basic Info */}
                    <div className="pt-20 pb-8 px-8 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                        <div className="flex-1 space-y-4">
                            <div className="flex flex-wrap items-center gap-3">
                                <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">{profile.full_name}</h2>
                                <div className="px-3 py-1 rounded-full bg-[#F0FDFA] text-[#14B8A6] text-xs font-bold uppercase tracking-wider">
                                    {profile.role === 'teacher' ? 'Eğitmen' : profile.role === 'parent' ? 'Ebeveyn' : 'Öğrenci'}
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                {isEditingUsername ? (
                                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                        <div className="relative group">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">@</span>
                                            <Input
                                                value={usernameInput}
                                                onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                                className="h-10 pl-8 pr-4 bg-gray-50 border-gray-200 focus:bg-white focus:border-[#14B8A6] rounded-xl font-bold text-gray-700 w-48 sm:w-64"
                                                placeholder="kullanici_adi"
                                                disabled={usernameLoading}
                                                autoFocus
                                            />
                                        </div>
                                        <div className="flex gap-1">
                                            <Button 
                                                size="icon" 
                                                variant="ghost" 
                                                onClick={handleUsernameUpdate}
                                                disabled={usernameLoading}
                                                className="h-10 w-10 rounded-xl bg-[#F0FDFA] text-[#14B8A6] hover:bg-[#14B8A6] hover:text-white transition-all shadow-sm"
                                            >
                                                {usernameLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                            </Button>
                                            <Button 
                                                size="icon" 
                                                variant="ghost" 
                                                onClick={() => setIsEditingUsername(false)}
                                                disabled={usernameLoading}
                                                className="h-10 w-10 rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => {
                                        setUsernameInput(profile.username || "");
                                        setIsEditingUsername(true);
                                    }}>
                                        <span className={cn(
                                            "font-bold text-lg transition-colors",
                                            profile.username ? "text-gray-400 group-hover:text-gray-600" : "text-[#14B8A6] animate-pulse"
                                        )}>
                                            @{profile.username || 'kullanici_adi_olustur'}
                                        </span>
                                        <button className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:text-[#14B8A6] transition-all">
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                                    <Clock className="w-4 h-4 text-[#14B8A6]" />
                                    {format(new Date(profile.created_at), "MMMM yyyy", { locale: tr })}'den beri üye
                                </div>
                            </div>
                            <p className="text-gray-600 font-medium max-w-2xl pt-2 leading-relaxed text-lg">
                                {profile.bio || "Henüz bir biyografi eklenmemiş."}
                            </p>
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center justify-around sm:justify-center gap-2 sm:gap-12 bg-gray-50/50 p-4 sm:p-8 rounded-[32px] border border-gray-100/50 w-full lg:w-auto">
                            <div className="text-center px-1 sm:px-2 min-w-[60px]">
                                <div className="text-2xl sm:text-3xl font-black text-gray-900">{stats.posts}</div>
                                <div className="text-[9px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mt-1">Gönderi</div>
                            </div>
                            <div className="w-px h-8 sm:h-10 bg-gray-200"></div>
                            <div className="text-center px-1 sm:px-2 min-w-[60px]">
                                <div className="text-2xl sm:text-3xl font-black text-gray-900">{stats.articles}</div>
                                <div className="text-[9px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mt-1">Makale</div>
                            </div>
                            <div className="w-px h-8 sm:h-10 bg-gray-200"></div>
                            <div className="text-center px-1 sm:px-2 min-w-[60px]">
                                <div className="text-2xl sm:text-3xl font-black text-gray-900">{stats.connections}</div>
                                <div className="text-[9px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mt-1">Bağlantı</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="space-y-12">
                    {isEditing ? (
                        <div className="bg-white rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-gray-100 p-10 space-y-10 animate-in fade-in zoom-in-95 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <Label htmlFor="fullname" className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1 h-3 bg-[#0c9789] rounded-full" /> Tam Ad Soyad
                                    </Label>
                                    <Input
                                        id="fullname"
                                        className="h-14 bg-gray-50 border-gray-200 focus:bg-white focus:ring-0 focus:border-[#14b8a6] transition-all rounded-[20px] font-bold text-gray-700"
                                        value={formData.full_name || ""}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-4">
                                    <Label className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1 h-3 bg-[#0c9789] rounded-full" /> Avatar Seçimi
                                    </Label>
                                    <div className="flex flex-wrap gap-3">
                                        {NEUTRAL_AVATARS.map((url, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, avatar_url: url })}
                                                className={cn(
                                                    "w-12 h-12 rounded-2xl border-2 transition-all hover:scale-110 p-0.5 overflow-hidden",
                                                    formData.avatar_url === url ? "border-[#0c9789] bg-[#f0fdfa] shadow-lg shadow-[#0c9789]/20 font-bold" : "border-gray-100 bg-gray-50"
                                                )}
                                            >
                                                <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label htmlFor="bio" className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1 h-3 bg-[#0c9789] rounded-full" /> Biyografi
                                </Label>
                                <Textarea
                                    id="bio"
                                    className="h-32 bg-gray-50 border-gray-200 focus:bg-white focus:ring-0 focus:border-[#14b8a6] transition-all rounded-[20px] font-medium text-gray-700 p-6"
                                    value={formData.bio || ""}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    placeholder="Kendinizden bahsedin..."
                                />
                            </div>

                            <div className="space-y-4">
                                <Label htmlFor="special_note" className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1 h-3 bg-[#0c9789] rounded-full" /> {profile.role === 'teacher' ? 'Uzmanlık Alanı / Detaylar' : 'Özel Notlar'}
                                </Label>
                                <Textarea
                                    id="special_note"
                                    className="h-40 bg-gray-50 border-gray-200 focus:bg-white focus:ring-0 focus:border-[#14b8a6] transition-all rounded-[20px] font-medium text-gray-700 p-6"
                                    value={formData.special_note || ""}
                                    onChange={(e) => setFormData({ ...formData, special_note: e.target.value })}
                                    placeholder="Projelerinize veya belirtmek istediğiniz detaylara yer verin..."
                                />
                            </div>

                            <div className="pt-6 border-t border-gray-100/80">
                                <Label className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2 mb-6">
                                    <div className="w-1 h-3 bg-[#0c9789] rounded-full" /> Sosyal Medya & Bağlantılar
                                </Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                            <Instagram className="h-4 w-4" /> Instagram
                                        </Label>
                                        <Input
                                            placeholder="@kullanici_adi"
                                            className="h-12 bg-gray-50 border-gray-200 rounded-2xl"
                                            value={getSocialLinks(formData).instagram}
                                            onChange={(e) => updateSocialLink('instagram', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                            <Twitter className="h-4 w-4" /> Twitter (X)
                                        </Label>
                                        <Input
                                            placeholder="@kullanici_adi"
                                            className="h-12 bg-gray-50 border-gray-200 rounded-2xl"
                                            value={getSocialLinks(formData).twitter}
                                            onChange={(e) => updateSocialLink('twitter', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                            <Facebook className="h-4 w-4" /> Facebook
                                        </Label>
                                        <Input
                                            placeholder="Profil linki veya ad"
                                            className="h-12 bg-gray-50 border-gray-200 rounded-2xl"
                                            value={getSocialLinks(formData).facebook}
                                            onChange={(e) => updateSocialLink('facebook', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                            <Music className="h-4 w-4" /> Spotify
                                        </Label>
                                        <Input
                                            placeholder="Spotify profil linki"
                                            className="h-12 bg-gray-50 border-gray-200 rounded-2xl"
                                            value={getSocialLinks(formData).spotify}
                                            onChange={(e) => updateSocialLink('spotify', e.target.value)}
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <Label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                            <Globe className="h-4 w-4" /> Web Sitesi / Diğer
                                        </Label>
                                        <Input
                                            placeholder="https://yourwebsite.com"
                                            className="h-12 bg-gray-50 border-gray-200 rounded-2xl"
                                            value={getSocialLinks(formData).website}
                                            onChange={(e) => updateSocialLink('website', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 pt-6">
                                <Button variant="ghost" onClick={() => setIsEditing(false)} className="rounded-2xl font-bold px-8 h-12">İptal</Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="bg-gray-900 hover:bg-gray-800 text-white rounded-2xl px-10 h-12 font-bold shadow-xl transition-all hover:-translate-y-1"
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    Profilini Güncelle
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {profile.role === 'teacher' && profile.verification_status && (
                                <VerificationStatus
                                    userId={profile.id}
                                    role={profile.role}
                                    status={profile.verification_status}
                                    onStatusChange={(newStatus) => setProfile(prev => prev ? { ...prev, verification_status: newStatus } : null)}
                                />
                            )}

                            <Tabs defaultValue="about" className="w-full">
                                <TabsList className="bg-transparent border-b border-gray-100 w-full justify-start h-auto p-0 rounded-none mb-8 overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide flex-nowrap hide-scrollbar">
                                    <TabsTrigger
                                        value="about"
                                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#14B8A6] data-[state=active]:bg-transparent data-[state=active]:text-[#14B8A6] px-8 py-4 font-black text-xs uppercase tracking-widest transition-all"
                                    >
                                        Hakkında
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="posts"
                                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#14B8A6] data-[state=active]:bg-transparent data-[state=active]:text-[#14B8A6] px-8 py-4 font-black text-xs uppercase tracking-widest transition-all"
                                    >
                                        Gönderiler
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="bookmarks"
                                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#14B8A6] data-[state=active]:bg-transparent data-[state=active]:text-[#14B8A6] px-8 py-4 font-black text-xs uppercase tracking-widest transition-all"
                                    >
                                        Kaydedilenler
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="portfolio"
                                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#14B8A6] data-[state=active]:bg-transparent data-[state=active]:text-[#14B8A6] px-8 py-4 font-black text-xs uppercase tracking-widest transition-all"
                                    >
                                        Portfolyo
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="about" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16">
                                        {/* Left Column: Personal Info & Bio */}
                                        <div className="lg:col-span-7 xl:col-span-8 space-y-8 lg:space-y-12">
                                            <div className="bg-white p-8 lg:p-12 rounded-[40px] border border-gray-100 shadow-sm space-y-10 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-48 h-48 bg-gray-50 rounded-bl-[120px] -z-0 transition-all group-hover:scale-110"></div>
                                                <div className="relative z-10">
                                                    <div className="flex items-center gap-3 mb-10">
                                                        <div className="w-1.5 h-6 bg-[#14B8A6] rounded-full"></div>
                                                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest">Kişisel Bilgiler</h3>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-12 gap-y-10">
                                                        <div className="space-y-2">
                                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tam Ad Soyad</div>
                                                            <div className="text-xl font-bold text-gray-800">{profile.full_name}</div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kullanıcı Rolü</div>
                                                            <div className="text-xl font-bold text-gray-800">
                                                                {profile.role === 'teacher' ? 'Eğitim Uzmanı' : profile.role === 'parent' ? 'Ebeveyn' : 'Öğrenci'}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bağlantı Kimliği</div>
                                                            <div className="text-xl font-bold text-[#14B8A6] flex items-center gap-1.5">
                                                                #{profile.custom_id}
                                                                <Copy className="w-4 h-4 opacity-50 cursor-pointer hover:opacity-100" />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2 lg:col-span-2">
                                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">E-posta Adresi</div>
                                                            <div className="text-xl font-bold text-gray-800">{profile.email || '—'}</div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Konum</div>
                                                            <div className="text-xl font-bold text-gray-800">Türkiye</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-white p-8 lg:p-12 rounded-[40px] border border-gray-100 shadow-sm space-y-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-1.5 h-6 bg-[#14B8A6] rounded-full"></div>
                                                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest">Biyografi</h3>
                                                </div>
                                                <p className="text-gray-600 font-medium leading-[2] text-xl italic bg-gray-50/50 p-8 sm:p-10 rounded-[40px] border border-dashed border-gray-200">
                                                    "{profile.bio || "Biyografi henüz doldurulmamış."}"
                                                </p>
                                            </div>
                                        </div>

                                        {/* Right Column: Social & Badges */}
                                        <div className="lg:col-span-5 xl:col-span-4 space-y-8 lg:space-y-12">
                                            <div className="bg-white p-8 lg:p-10 rounded-[40px] border border-gray-100 shadow-sm space-y-8 relative overflow-hidden group">
                                                <div className="absolute top-0 left-0 w-24 h-24 bg-gray-50 rounded-br-[80px] -z-0"></div>
                                                <div className="relative z-10">
                                                    <div className="flex items-center gap-3 mb-8">
                                                        <div className="w-1 h-5 bg-[#14B8A6] rounded-full"></div>
                                                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Sosyal Bağlantılar</h3>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-5">
                                                        {getSocialLinks(formData).website && (
                                                            <a href={getSocialLinks(formData).website} target="_blank" rel="noopener" className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-[#14B8A6] hover:bg-[#F0FDFA] transition-all border border-gray-100 shadow-sm hover:-translate-y-1">
                                                                <Globe className="w-7 h-7" />
                                                            </a>
                                                        )}
                                                        {getSocialLinks(formData).instagram && (
                                                            <a href="#" className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-pink-500 hover:bg-pink-50 transition-all border border-gray-100 shadow-sm hover:-translate-y-1">
                                                                <Instagram className="w-7 h-7" />
                                                            </a>
                                                        )}
                                                        {getSocialLinks(formData).twitter && (
                                                            <a href="#" className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-[#1DA1F2] hover:bg-blue-50 transition-all border border-gray-100 shadow-sm hover:-translate-y-1">
                                                                <Twitter className="w-7 h-7" />
                                                            </a>
                                                        )}
                                                        <button className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-[#14B8A6] hover:bg-[#F0FDFA] transition-all border border-gray-100 shadow-sm hover:-translate-y-1">
                                                            <ExternalLink className="w-7 h-7" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-white p-8 lg:p-10 rounded-[40px] border border-gray-100 shadow-sm space-y-8">
                                                <div className="flex items-center justify-between mb-6">
                                                    <h3 className="text-xl font-bold text-gray-900">Rozetler</h3>
                                                </div>
                                                <div className="flex flex-col gap-4">
                                                    <div className="p-5 rounded-[32px] bg-gray-50/50 border border-gray-50 flex items-center gap-5 transition-all hover:bg-white hover:shadow-lg">
                                                        <div className="w-14 h-14 rounded-full bg-[#E0E7FF] flex items-center justify-center text-[#4F46E5] flex-shrink-0">
                                                            <ShieldCheck className="w-7 h-7" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-base font-bold text-gray-900 leading-tight">Doğrulanmış Üye</div>
                                                            <div className="text-[12px] font-medium text-gray-500 mt-0.5">Kimlik doğrulaması tamamlandı.</div>
                                                        </div>
                                                    </div>
                                                    <div className="p-5 rounded-[32px] bg-gray-50/50 border border-gray-50 flex items-center gap-5 transition-all hover:bg-white hover:shadow-lg">
                                                        <div className="w-14 h-14 rounded-full bg-[#FFF7ED] flex items-center justify-center text-[#EA580C] flex-shrink-0">
                                                            <Edit2 className="w-7 h-7" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-base font-bold text-gray-900 leading-tight">İlk Gönderi</div>
                                                            <div className="text-[12px] font-medium text-gray-500 mt-0.5">Topluluğa ilk katkı yapıldı.</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="posts" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="max-w-2xl mx-auto space-y-6 mt-4">
                                        <p className="text-center text-gray-400 font-medium py-12">Gönderileriniz burada listelenecek.</p>
                                    </div>
                                </TabsContent>

                                <TabsContent value="bookmarks" className="animate-in fade-in slide-in-from-bottom-5 duration-700">
                                    {loadingBookmarks ? (
                                        <div className="py-24 flex flex-col items-center gap-6">
                                            <div className="w-12 h-12 border-4 border-[#0c9789] border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-gray-300 font-black text-xs uppercase tracking-widest">Kayıtlar Hazırlanıyor...</p>
                                        </div>
                                    ) : (bookmarkedPosts.length === 0 && bookmarkedArticles.length === 0) ? (
                                        <div className="bg-white rounded-[40px] border border-gray-100 p-20 text-center">
                                            <div className="mx-auto w-24 h-24 bg-gray-50 rounded-[30px] flex items-center justify-center mb-6">
                                                <Bookmark className="h-10 w-10 text-gray-200" />
                                            </div>
                                            <h3 className="text-xl font-black text-gray-800 mb-2">Henüz bir şey kaydetmediniz</h3>
                                            <p className="text-gray-400 font-medium text-sm">Beğendiğiniz içerikleri buraya ekleyerek daha sonra kolayca ulaşabilirsiniz.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-1 h-5 bg-[#0c9789] rounded-full" />
                                                    <h3 className="text-xs font-black text-gray-700 uppercase tracking-[0.2em]">Makaleler</h3>
                                                </div>
                                                {bookmarkedArticles.map(art => (
                                                    <div key={art.id} className="p-6 bg-white rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                                                        <a href={`/knowledge/${art.id}`} className="flex-1 min-w-0">
                                                            <h4 className="font-bold text-gray-800 group-hover:text-[#0c9789] transition-colors truncate">{art.title}</h4>
                                                            <p className="text-xs text-gray-400 mt-1">{art.author?.full_name}</p>
                                                        </a>
                                                        <ExternalLink className="h-4 w-4 text-gray-200 group-hover:text-[#0c9789] transition-all" />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-1 h-5 bg-[#0c9789] rounded-full" />
                                                    <h3 className="text-xs font-black text-gray-700 uppercase tracking-[0.2em]">Gönderiler</h3>
                                                </div>
                                                {bookmarkedPosts.map(post => (
                                                    <PostItem key={post.id} post={post} currentUserId={profile.id} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="portfolio" className="animate-in fade-in slide-in-from-bottom-5 duration-700">
                                    <PortfolioTab userId={profile.id} isOwner={true} role={profile.role} />
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}
                </div>

                {/* Account Actions */}
                <div className="mt-24 pt-10 border-t border-gray-100 flex justify-center">
                    <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className="text-red-400 hover:text-red-500 hover:bg-red-50 rounded-2xl font-black text-xs uppercase tracking-widest px-8"
                    >
                        <LogOut className="h-4 w-4 mr-2" /> Oturumu Kapat
                    </Button>
                </div>
            </div>
        </AppShell>
    );
}

