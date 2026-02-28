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
import { ShieldCheck, Loader2, LogOut, Save, Copy, Check, Edit2, AlertCircle, Instagram, Twitter, Facebook, Globe, Music, ExternalLink, Bookmark, FileText } from "lucide-react";
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
    social_links: {
        instagram?: string;
        twitter?: string;
        facebook?: string;
        spotify?: string;
        website?: string;
    } | null;
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

    // Faceless, minimalist human avatars for all users (matches user style)
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
        // ... rest of the fetchBookmarks and handlers ...

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

                // Step 2: Fetch the actual posts
                const { data: postsData } = await createClient()
                    .from("posts")
                    .select(`
                        id, content, is_anonymous, likes_count, created_at,
                        category, image_url, author_id,
                        profiles!posts_author_id_fkey (
                            id, full_name, avatar_url, is_verified_expert
                        )
                    `)
                    .in("id", postIds);

                if (postsData) {
                    // Step 3: Fetch which posts user has liked
                    const { data: likesData } = await createClient()
                        .from("post_likes")
                        .select("post_id")
                        .eq("user_id", user.id)
                        .in("post_id", postIds);

                    const likedPostIds = new Set(likesData?.map((l: { post_id: string }) => l.post_id) || []);

                    // Preserve bookmark order
                    const ordered = postIds
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        .map((id: string) => postsData.find((p: any) => p.id === id))
                        .filter(Boolean)
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

                // Step 2b: Fetch the actual articles
                const { data: articlesData } = await createClient()
                    .from("articles")
                    .select(`
                        id, title, summary, category, created_at, author_id,
                        author:author_id ( full_name, avatar_url )
                    `)
                    .in("id", articleIds);

                if (articlesData) {
                    // Preserve bookmark order
                    const ordered = articleIds
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        .map((id: string) => articlesData.find((a: any) => a.id === id))
                        .filter(Boolean)
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        fetchProfile();
        fetchBookmarks();
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
                    social_links: formData.social_links // Update JSONB column
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

        // Basic validation
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
                setProfile({
                    ...profile,
                    username: usernameInput,
                    username_last_changed: new Date().toISOString()
                });
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

    const getNextChangeDate = () => {
        if (!profile?.username_last_changed) return null;
        const lastChanged = new Date(profile.username_last_changed);
        const nextChange = new Date(lastChanged);
        nextChange.setMonth(nextChange.getMonth() + 1);
        return format(nextChange, "d MMMM yyyy", { locale: tr });
    };

    // Helper to handle social input change
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
            <AppShell>
                <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
                </div>
            </AppShell>
        );
    }

    if (!profile) return null;

    return (
        <AppShell>
            <div className="max-w-3xl mx-auto py-8 px-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-xl font-bold text-stone-800">Profilim</h1>
                    {!isEditing && (
                        <Button variant="outline" size="sm" className="rounded-xl border-stone-200 text-stone-600 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-200" onClick={() => setIsEditing(true)}>
                            <Edit2 className="h-4 w-4 mr-2" /> Profili Düzenle
                        </Button>
                    )}
                </div>

                <div className="card-elevated rounded-2xl overflow-hidden mb-6 animate-fade-up">
                    {/* Cover & Avatar Area */}
                    <div className="h-28 sm:h-40 gradient-cover relative">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0">
                            <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-white shadow-xl bg-white ring-2 ring-stone-100">
                                <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
                                <AvatarFallback className="text-3xl sm:text-4xl bg-gradient-to-br from-stone-100 to-stone-200 text-stone-700">
                                    {profile.full_name?.[0]?.toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </div>

                    <div className="pt-16 sm:pt-20 pb-6 px-4 sm:px-6">
                        {/* Name & ID */}
                        <div className="mb-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-stone-900 flex flex-wrap items-center gap-2 tracking-tight">
                                        <span className="break-words">{profile.full_name}</span>
                                        <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 text-[10px] sm:text-xs font-semibold uppercase tracking-wider border border-teal-100">
                                            {profile.role === 'teacher' ? 'Öğretmen' : (profile.role === 'student' ? 'Öğrenci' : 'Ebeveyn')}
                                        </span>
                                    </h2>

                                    {/* Unique ID Badge */}
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3">
                                        <div className="inline-flex items-center gap-1.5 bg-stone-900 text-stone-50 px-3 py-1.5 rounded-lg text-xs font-mono font-medium shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer group"
                                            onClick={() => {
                                                navigator.clipboard.writeText(profile.custom_id.toString());
                                                toast.success("ID kopyalandı!");
                                            }}
                                            title="Benzersiz Özel ID - Kopyalamak için tıkla"
                                        >
                                            <span className="text-teal-400">#</span>
                                            <span>{profile.custom_id || "---"}</span>
                                            <Copy className="h-3 w-3 text-stone-400 group-hover:text-white transition-colors" />
                                        </div>
                                        <span className="text-[10px] sm:text-xs text-stone-500 font-medium">Bu ID size özeldir.</span>
                                    </div>
                                </div>
                            </div>

                            {/* Username Section */}
                            <div className="mt-8 p-1 bg-gradient-to-r from-stone-100 to-stone-50 rounded-2xl border border-stone-200/60 shadow-inner">
                                <div className="bg-white/60 p-4 sm:p-5 rounded-xl backdrop-blur-sm">
                                    <Label className="text-[10px] sm:text-xs text-stone-500 font-bold uppercase tracking-widest mb-3 flex items-center gap-1">
                                        <span className="w-1 h-1 bg-teal-500 rounded-full inline-block"></span> Kullanıcı Adı
                                    </Label>

                                    {isEditingUsername ? (
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 max-w-sm">
                                            <div className="relative flex-1 group w-full">
                                                <span className="absolute left-3 top-2.5 text-stone-400 group-focus-within:text-teal-500 transition-colors font-medium">@</span>
                                                <Input
                                                    value={usernameInput}
                                                    onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                                    className="pl-7 w-full bg-white border-stone-200 focus-visible:ring-teal-500 font-medium"
                                                    placeholder="kullanici_adi"
                                                    maxLength={20}
                                                />
                                            </div>
                                            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                                <Button size="sm" onClick={handleUsernameUpdate} disabled={usernameLoading} className="flex-1 sm:flex-none bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-200">
                                                    {usernameLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Kaydet
                                                </Button>
                                                <Button size="sm" variant="ghost" className="flex-1 sm:flex-none" onClick={() => {
                                                    setIsEditingUsername(false);
                                                    setUsernameInput(profile.username || "");
                                                }}>
                                                    İptal
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div className="text-lg text-stone-700 font-semibold tracking-tight">
                                                {profile.username ? <span className="text-teal-700">@{profile.username}</span> : <span className="text-stone-400 font-normal italic">Kullanıcı adı oluşturulmadı</span>}
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-stone-200 text-stone-600 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-all shadow-sm"
                                                onClick={() => {
                                                    if (canChangeUsername()) {
                                                        setIsEditingUsername(true);
                                                    } else {
                                                        toast.warning(`Kullanıcı adınızı şu tarihe kadar değiştiremezsiniz: ${getNextChangeDate()}`);
                                                    }
                                                }}
                                            >
                                                {profile.username ? "Değiştir" : "Oluştur"}
                                            </Button>
                                        </div>
                                    )}

                                    {!canChangeUsername() && !isEditingUsername && (
                                        <p className="text-[10px] text-orange-600 font-medium mt-3 flex items-center gap-1.5 p-2 bg-orange-50 rounded-lg border border-orange-100 inline-flex">
                                            <AlertCircle className="h-3 w-3" />
                                            Bir sonraki değişiklik: {getNextChangeDate()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* General Info Form / View */}
                        {isEditing ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-4 pt-2">
                                    <Label className="text-stone-700 font-bold flex items-center gap-2">
                                        <ShieldCheck className="h-4 w-4 text-teal-500" /> Profil Deseni Seçin
                                    </Label>
                                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                                        {NEUTRAL_AVATARS.map((avatar, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, avatar_url: avatar })}
                                                className={cn(
                                                    "relative rounded-xl overflow-hidden aspect-square border-2 transition-all p-1.5",
                                                    formData.avatar_url === avatar
                                                        ? "border-teal-500 bg-teal-50 shadow-md scale-105"
                                                        : "border-stone-100 bg-stone-50 hover:border-stone-200"
                                                )}
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={avatar} alt={`Avatar ${index + 1}`} className="w-full h-full object-contain" />
                                                {formData.avatar_url === avatar && (
                                                    <div className="absolute top-0 right-0 bg-teal-500 text-white p-0.5 rounded-bl-lg">
                                                        <Check className="h-3 w-3" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-stone-100">
                                    <div className="space-y-2">
                                        <Label htmlFor="fullname" className="text-stone-700 font-bold">Ad Soyad</Label>
                                        <Input
                                            id="fullname"
                                            className="bg-stone-50 border-stone-200 focus:bg-white h-11 rounded-xl transition-all"
                                            value={formData.full_name || ""}
                                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="avatar_url" className="text-stone-700 font-bold">Özel URL (Opsiyonel)</Label>
                                        <Input
                                            id="avatar_url"
                                            className="bg-stone-50 border-stone-200 focus:bg-white h-11 rounded-xl transition-all"
                                            value={formData.avatar_url || ""}
                                            onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                                            placeholder="https://example.com/photo.jpg"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="bio" className="text-stone-700 font-bold flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-teal-500" /> Biyografi
                                        </Label>
                                        <span className={cn(
                                            "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                            (formData.bio?.length || 0) > 450 ? "bg-red-50 text-red-500" : "bg-stone-50 text-stone-400"
                                        )}>
                                            {formData.bio?.length || 0}/500
                                        </span>
                                    </div>
                                    <Textarea
                                        id="bio"
                                        className="bg-stone-50 border-stone-200 focus:bg-white focus:ring-0 focus:border-teal-300 transition-all resize-none rounded-xl"
                                        value={formData.bio || ""}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value.slice(0, 500) })}
                                        placeholder="Kendinizden bahsedin..."
                                        rows={3}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="special_note" className="text-stone-700 font-bold flex items-center gap-2">
                                            <Edit2 className="h-4 w-4 text-violet-500" />
                                            {profile.role === 'teacher' ? 'Uzmanlık Alanı / Detaylar' : 'Özel Notlar'}
                                        </Label>
                                        <span className={cn(
                                            "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                            (formData.special_note?.length || 0) > 900 ? "bg-red-50 text-red-500" : "bg-stone-50 text-stone-400"
                                        )}>
                                            {formData.special_note?.length || 0}/1000
                                        </span>
                                    </div>
                                    <Textarea
                                        id="special_note"
                                        className="bg-stone-50 border-stone-200 focus:bg-white focus:ring-0 focus:border-violet-200 transition-all resize-none rounded-xl"
                                        value={formData.special_note || ""}
                                        onChange={(e) => setFormData({ ...formData, special_note: e.target.value.slice(0, 1000) })}
                                        placeholder="Projelerinize, ilgi alanlarınıza veya belirtmek istediğiniz özel durumlara yer verin..."
                                        rows={4}
                                    />
                                </div>

                                {/* Social Media Inputs */}
                                <div className="pt-6 border-t border-stone-100/80">
                                    <div className="flex items-center gap-2 mb-5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                                        <h3 className="text-sm font-black text-stone-800 uppercase tracking-widest">Bağlantılar</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="group space-y-2">
                                            <Label className="flex items-center gap-2 text-xs font-bold text-stone-500 group-focus-within:text-pink-500 transition-colors">
                                                <Instagram className="h-4 w-4" /> Instagram
                                            </Label>
                                            <Input
                                                placeholder="@kullanici_adi"
                                                className="bg-stone-50 border-stone-200 focus:bg-white rounded-xl h-11"
                                                value={getSocialLinks(formData).instagram}
                                                onChange={(e) => updateSocialLink('instagram', e.target.value)}
                                            />
                                        </div>
                                        <div className="group space-y-2">
                                            <Label className="flex items-center gap-2 text-xs font-bold text-stone-500 group-focus-within:text-teal-500 transition-colors">
                                                <Twitter className="h-4 w-4" /> Twitter (X)
                                            </Label>
                                            <Input
                                                placeholder="@kullanici_adi"
                                                className="bg-stone-50 border-stone-200 focus:bg-white rounded-xl h-11"
                                                value={getSocialLinks(formData).twitter}
                                                onChange={(e) => updateSocialLink('twitter', e.target.value)}
                                            />
                                        </div>
                                        <div className="group space-y-2">
                                            <Label className="flex items-center gap-2 text-xs font-bold text-stone-500 group-focus-within:text-blue-600 transition-colors">
                                                <Facebook className="h-4 w-4" /> Facebook
                                            </Label>
                                            <Input
                                                placeholder="Profil linki veya ad"
                                                className="bg-stone-50 border-stone-200 focus:bg-white rounded-xl h-11"
                                                value={getSocialLinks(formData).facebook}
                                                onChange={(e) => updateSocialLink('facebook', e.target.value)}
                                            />
                                        </div>
                                        <div className="group space-y-2">
                                            <Label className="flex items-center gap-2 text-xs font-bold text-stone-500 group-focus-within:text-green-500 transition-colors">
                                                <Music className="h-4 w-4" /> Spotify
                                            </Label>
                                            <Input
                                                placeholder="Spotify profil linki"
                                                className="bg-stone-50 border-stone-200 focus:bg-white rounded-xl h-11"
                                                value={getSocialLinks(formData).spotify}
                                                onChange={(e) => updateSocialLink('spotify', e.target.value)}
                                            />
                                        </div>
                                        <div className="group space-y-2 md:col-span-2">
                                            <Label className="flex items-center gap-2 text-xs font-bold text-stone-500 group-focus-within:text-indigo-600 transition-colors">
                                                <Globe className="h-4 w-4" /> Web Sitesi / Diğer Portfolyo
                                            </Label>
                                            <Input
                                                placeholder="https://yourwebsite.com"
                                                className="bg-stone-50 border-stone-200 focus:bg-white rounded-xl h-11"
                                                value={getSocialLinks(formData).website}
                                                onChange={(e) => updateSocialLink('website', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-stone-100">
                                    <Button variant="ghost" onClick={() => setIsEditing(false)} className="rounded-xl font-bold">İptal</Button>
                                    <Button onClick={handleSave} disabled={saving} className="bg-stone-900 hover:bg-stone-800 text-white shadow-xl shadow-slate-200 rounded-xl px-6 font-bold h-11">
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                        Kaydet
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                {profile.role === 'teacher' && profile.verification_status && (
                                    <div className="bg-white rounded-3xl border border-stone-100 overflow-hidden shadow-sm">
                                        <VerificationStatus
                                            userId={profile.id}
                                            role={profile.role}
                                            status={profile.verification_status}
                                            onStatusChange={(newStatus) => setProfile(prev => prev ? { ...prev, verification_status: newStatus } : null)}
                                        />
                                    </div>
                                )}

                                <Tabs defaultValue="about" className="w-full">
                                    <TabsList className="grid grid-cols-3 w-full mb-10 h-auto bg-stone-100/50 p-1 sm:p-1.5 rounded-2xl gap-1">
                                        <TabsTrigger value="about" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-teal-600 transition-all font-bold text-[11px] sm:text-sm uppercase tracking-wider py-2.5 sm:py-3 px-1 sm:px-2">
                                            Hakkında
                                        </TabsTrigger>
                                        <TabsTrigger value="bookmarks" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-teal-600 transition-all font-bold text-[11px] sm:text-sm uppercase tracking-wider py-2.5 sm:py-3 px-1 sm:px-2 flex items-center justify-center gap-1">
                                            <Bookmark className="h-3 w-3 sm:h-4 sm:w-4" />
                                            <span className="hidden sm:inline">Kaydedilenler</span>
                                            <span className="sm:hidden">Kayıtlı</span>
                                        </TabsTrigger>
                                        <TabsTrigger value="portfolio" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-teal-600 transition-all font-bold text-[11px] sm:text-sm uppercase tracking-wider py-2.5 sm:py-3 px-1 sm:px-2">
                                            <span className="hidden sm:inline">Portfölyom</span>
                                            <span className="sm:hidden">Portföy</span>
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="about" className="space-y-8 mt-0 animate-in fade-in slide-in-from-bottom-3 duration-500">
                                        <div className="group relative">
                                            <div className="flex items-center gap-3 mb-5">
                                                <div className="w-1.5 h-6 bg-teal-500 rounded-full group-hover:h-8 transition-all duration-300"></div>
                                                <h3 className="text-sm font-black text-stone-800 uppercase tracking-widest">
                                                    Biyografi
                                                </h3>
                                            </div>
                                            <div className="bg-white p-7 rounded-[32px] border border-stone-100 shadow-sm leading-relaxed text-stone-600 group-hover:border-teal-100 group-hover:shadow-md transition-all duration-300 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                                                {profile.bio ? (
                                                    <p className="whitespace-pre-wrap relative z-10 font-medium">{profile.bio}</p>
                                                ) : (
                                                    <p className="text-stone-400 italic font-medium relative z-10">Kendinizden henüz bahsetmediniz. Düzenleyerek başlayabilirsiniz.</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="group relative">
                                            <div className="flex items-center gap-3 mb-5">
                                                <div className="w-1.5 h-6 bg-violet-500 rounded-full group-hover:h-8 transition-all duration-300"></div>
                                                <h3 className="text-sm font-black text-stone-800 uppercase tracking-widest">
                                                    {profile.role === 'teacher' ? 'Uzmanlık Alanı' : 'Genel Notlar'}
                                                </h3>
                                            </div>
                                            <div className="bg-stone-50/70 p-7 rounded-[32px] border border-stone-100 shadow-inner group-hover:bg-stone-50 transition-all duration-300 relative overflow-hidden">
                                                <div className="absolute bottom-0 right-0 w-24 h-24 bg-violet-50 rounded-full -mb-12 -mr-12 opacity-40 group-hover:scale-110 transition-transform duration-500"></div>
                                                {profile.special_note ? (
                                                    <p className="text-stone-700 whitespace-pre-wrap font-medium relative z-10">{profile.special_note}</p>
                                                ) : (
                                                    <p className="text-stone-400 italic relative z-10">Ek bilgi belirtilmemiş.</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Social Links Display */}
                                        {profile.social_links && Object.values(profile.social_links).some(v => v) && (
                                            <div className="pt-8 border-t border-stone-100/80">
                                                <h3 className="text-xs font-black text-stone-400 mb-6 uppercase tracking-[0.2em] text-center">Bağlantıda Kalalım</h3>
                                                <div className="flex flex-wrap justify-center gap-4">
                                                    {profile.social_links.instagram && (
                                                        <a href={profile.social_links.instagram.startsWith('http') ? profile.social_links.instagram : `https://instagram.com/${profile.social_links.instagram}`}
                                                            target="_blank" rel="noopener noreferrer"
                                                            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-br from-pink-500 to-rose-500 text-white rounded-2xl shadow-lg shadow-pink-200 hover:shadow-pink-300 hover:-translate-y-1 transition-all">
                                                            <Instagram className="h-5 w-5" />
                                                            <span className="font-black text-xs uppercase tracking-wider">Instagram</span>
                                                        </a>
                                                    )}
                                                    {profile.social_links.twitter && (
                                                        <a href={profile.social_links.twitter.startsWith('http') ? profile.social_links.twitter : `https://twitter.com/${profile.social_links.twitter}`}
                                                            target="_blank" rel="noopener noreferrer"
                                                            className="flex items-center gap-3 px-6 py-3 bg-stone-900 text-white rounded-2xl shadow-lg shadow-slate-200 hover:shadow-slate-300 hover:-translate-y-1 transition-all">
                                                            <Twitter className="h-4 w-4" />
                                                            <span className="font-black text-xs uppercase tracking-wider">X.com</span>
                                                        </a>
                                                    )}
                                                    {profile.social_links.spotify && (
                                                        <a href={profile.social_links.spotify}
                                                            target="_blank" rel="noopener noreferrer"
                                                            className="flex items-center gap-3 px-6 py-3 bg-[#1DB954] text-white rounded-2xl shadow-lg shadow-green-100 hover:shadow-green-200 hover:-translate-y-1 transition-all">
                                                            <Music className="h-5 w-5" />
                                                            <span className="font-black text-xs uppercase tracking-wider">Spotify</span>
                                                        </a>
                                                    )}
                                                    {profile.social_links.website && (
                                                        <a href={profile.social_links.website}
                                                            target="_blank" rel="noopener noreferrer"
                                                            className="flex items-center gap-3 px-6 py-3 bg-white text-stone-900 border border-stone-200 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group">
                                                            <Globe className="h-5 w-5 text-teal-500" />
                                                            <span className="font-black text-xs uppercase tracking-wider group-hover:text-teal-600 transition-colors">Portfolyo</span>
                                                            <ExternalLink className="h-3 w-3 opacity-30 group-hover:opacity-100 transition-opacity" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="bookmarks" className="mt-0 animate-in fade-in slide-in-from-bottom-3 duration-500">
                                        {loadingBookmarks ? (
                                            <div className="py-20 flex flex-col items-center gap-4">
                                                <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
                                                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Kayıtlar yükleniyor...</p>
                                            </div>
                                        ) : (bookmarkedPosts.length === 0 && bookmarkedArticles.length === 0) ? (
                                            <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-stone-200 px-6">
                                                <div className="mx-auto w-24 h-24 bg-stone-50 rounded-[32px] flex items-center justify-center mb-6 border border-stone-100 transition-transform duration-500 hover:scale-110">
                                                    <Bookmark className="h-10 w-10 text-stone-200" />
                                                </div>
                                                <h3 className="text-xl font-black text-stone-800 mb-2 tracking-tight">Kayıtlı İçerik Yok</h3>
                                                <p className="text-stone-400 font-medium text-sm max-w-[240px] mx-auto leading-relaxed">İlgini çeken paylaşım ve makaleleri buraya kaydedebilirsin.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-8">
                                                {/* Bookmarked Articles */}
                                                {bookmarkedArticles.length > 0 && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <div className="w-1 h-5 bg-teal-500 rounded-full"></div>
                                                            <h3 className="font-bold text-stone-700 text-sm uppercase tracking-widest">Makaleler</h3>
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-4">
                                                            {bookmarkedArticles.map((art) => (
                                                                <div key={art.id} className="flex gap-3 p-4 bg-white rounded-2xl border border-stone-100 hover:border-teal-200 hover:shadow-md transition-all group items-start">
                                                                    <a href={`/knowledge/${art.id}`} className="flex-1 min-w-0 block">
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">{art.category}</span>
                                                                        <h4 className="font-bold text-stone-900 mt-2 mb-1 text-sm leading-snug group-hover:text-teal-700 transition-colors line-clamp-2">{art.title}</h4>
                                                                        <p className="text-xs text-stone-400 line-clamp-1">{art.author?.full_name}</p>
                                                                    </a>
                                                                    <button
                                                                        onClick={async () => {
                                                                            const { error } = await createClient().from("bookmarks")
                                                                                .delete()
                                                                                .eq("user_id", profile.id)
                                                                                .eq("item_id", art.id)
                                                                                .eq("item_type", "article");
                                                                            if (!error) {
                                                                                setBookmarkedArticles(prev => prev.filter(a => a.id !== art.id));
                                                                                toast.success("Kaydedilenlerden kaldırıldı.");
                                                                            } else {
                                                                                toast.error("Kaldırılamadı: " + error.message);
                                                                            }
                                                                        }}
                                                                        className="shrink-0 p-1.5 rounded-full text-stone-300 hover:text-red-400 hover:bg-red-50 transition-colors mt-0.5"
                                                                        title="Kaydedilenlerden kaldır"
                                                                    >
                                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Bookmarked Posts */}
                                                {bookmarkedPosts.length > 0 && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <div className="w-1 h-5 bg-indigo-500 rounded-full"></div>
                                                            <h3 className="font-bold text-stone-700 text-sm uppercase tracking-widest">Gönderiler</h3>
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-6">
                                                            {bookmarkedPosts.map(post => (
                                                                <div key={post.id} className="transform transition-all active:scale-[0.99]">
                                                                    <PostItem
                                                                        post={post}
                                                                        currentUserId={profile.id}
                                                                        isAdmin={profile.is_admin}
                                                                        onDelete={(id) => {
                                                                            setBookmarkedPosts(prev => prev.filter(p => p.id !== id));
                                                                        }}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="portfolio" className="mt-0 animate-in fade-in slide-in-from-bottom-3 duration-500">
                                        <PortfolioTab userId={profile.id} isOwner={true} role={profile.role} />
                                    </TabsContent>
                                </Tabs>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-center">
                    <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Oturumu Kapat
                    </Button>
                </div>
            </div>
        </AppShell>
    );
}
