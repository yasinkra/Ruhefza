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
import { ShieldCheck, Loader2, LogOut, Save, Copy, Check, Edit2, Instagram, Twitter, Facebook, Globe, Music, ExternalLink, Bookmark, FileText, Clock } from "lucide-react";
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
                        id, content, is_anonymous, likes_count, created_at,
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
                    <Loader2 className="h-8 w-8 animate-spin text-[#7b9e89]" />
                </div>
            </AppShell>
        );
    }

    if (!profile) return null;

    return (
        <AppShell>
            <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
                {/* Header Title */}
                <div className="flex justify-between items-center mb-10">
                    <h1 className="text-3xl font-black text-stone-800 tracking-tight">Profilim</h1>
                    {!isEditing && (
                        <Button
                            onClick={() => setIsEditing(true)}
                            className="bg-white hover:bg-stone-50 text-stone-600 rounded-2xl px-6 h-12 font-bold border border-stone-200 shadow-sm transition-all hover:-translate-y-1"
                        >
                            <Edit2 className="h-4 w-4 mr-2 text-[#7b9e89]" /> Profili Düzenle
                        </Button>
                    )}
                </div>

                {/* Profile Header Card */}
                <div className="bg-white rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-stone-100 overflow-hidden mb-12 group transition-all duration-500 hover:shadow-[0_30px_70px_rgba(0,0,0,0.06)]">
                    {/* Cover Area */}
                    <div className={cn(
                        "h-48 relative overflow-hidden transition-all duration-700",
                        profile.role === 'teacher' ? "bg-gradient-to-br from-[#7b9e89] via-[#a2c1b1] to-[#6ba88f]" :
                            profile.role === 'student' ? "bg-gradient-to-br from-[#b388c6] via-[#d4a5db] to-[#9a6cb4]" :
                                profile.role === 'parent' ? "bg-gradient-to-br from-[#e89b7b] via-[#f7c5ae] to-[#d47d55]" :
                                    "bg-gradient-to-br from-stone-400 to-stone-600"
                    )}>
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full blur-2xl -ml-10 -mb-10"></div>

                        {/* Avatar */}
                        <div className="absolute -bottom-16 left-10">
                            <div className="relative group/avatar">
                                <div className="absolute inset-0 bg-white rounded-[35%] blur-xl opacity-40"></div>
                                <Avatar className="h-32 w-32 border-[6px] border-white shadow-2xl rounded-[32px] bg-white transition-transform duration-500 hover:scale-105">
                                    <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
                                    <AvatarFallback className="text-4xl font-black text-stone-200 bg-stone-50">{profile.full_name[0]?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                {profile.role === 'teacher' && profile.verification_status === 'approved' && (
                                    <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-2xl shadow-lg border border-stone-50">
                                        <div className="bg-[#7b9e89] p-1.5 rounded-xl">
                                            <ShieldCheck className="h-4 w-4 text-white" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="pt-20 pb-10 px-10">
                        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-4xl font-black text-stone-800 tracking-tight">{profile.full_name}</h2>
                                    {isEditingUsername ? (
                                        <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
                                            <Input
                                                value={usernameInput}
                                                onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                                className="h-8 w-40 rounded-lg text-sm font-bold border-[#7b9e89]"
                                                placeholder="kullanicıadi"
                                            />
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-[#7b9e89]" onClick={handleUsernameUpdate} disabled={usernameLoading}>
                                                {usernameLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-stone-400" onClick={() => setIsEditingUsername(false)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 group/user cursor-pointer" onClick={() => canChangeUsername() && setIsEditingUsername(true)}>
                                            <span className="text-[#7b9e89] font-bold text-lg">@{profile.username || 'kullanici_adi'}</span>
                                            {canChangeUsername() && <Edit2 className="h-3.5 w-3.5 text-stone-300 opacity-0 group-hover/user:opacity-100 transition-opacity" />}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-4">
                                    <div className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm shadow-sm border",
                                        profile.role === 'teacher' ? "bg-[#eaf2ed] text-[#557b66] border-[#7b9e89]/20" :
                                            profile.role === 'student' ? "bg-[#f4eefa] text-[#8a5ea5] border-[#b388c6]/20" :
                                                "bg-[#fcece6] text-[#c27658] border-[#e89b7b]/20"
                                    )}>
                                        <span className="text-lg">
                                            {profile.role === 'teacher' ? '👩‍🏫' : profile.role === 'student' ? '🎓' : '👨‍👩‍👧'}
                                        </span>
                                        {profile.role === 'teacher' ? 'Uzman Öğretmen' : profile.role === 'student' ? 'Öğrenci' : 'Ebeveyn'}
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 border border-stone-100 rounded-2xl text-stone-400 font-mono text-xs font-bold leading-none cursor-pointer hover:bg-stone-100 transition-colors shadow-sm"
                                        onClick={() => {
                                            navigator.clipboard.writeText(profile.custom_id.toString());
                                            toast.success("ID kopyalandı!");
                                        }}>
                                        <span className="opacity-50 text-base">#</span>
                                        {profile.custom_id}
                                        <Copy className="h-3 w-3 ml-1 opacity-20" />
                                    </div>
                                    <div className="flex items-center gap-2 text-stone-400 font-bold text-xs uppercase tracking-widest bg-stone-50/50 px-3 py-1.5 rounded-2xl border border-stone-100/50">
                                        <Clock className="h-3.5 w-3.5 text-[#7b9e89]" />
                                        {format(new Date(profile.created_at), "MMMM yyyy", { locale: tr })}'den beri üye
                                    </div>
                                </div>
                            </div>

                            {!isEditing && (
                                <div className="flex items-center gap-3">
                                    <Button variant="ghost" onClick={handleLogout} className="text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-2xl font-bold transition-colors">
                                        <LogOut className="h-4 w-4 mr-2" /> Çıkış Yap
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="space-y-12">
                    {isEditing ? (
                        <div className="bg-white rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-stone-100 p-10 space-y-10 animate-in fade-in zoom-in-95 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <Label htmlFor="fullname" className="text-sm font-black text-stone-800 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1 h-3 bg-[#7b9e89] rounded-full" /> Tam Ad Soyad
                                    </Label>
                                    <Input
                                        id="fullname"
                                        className="h-14 bg-stone-50 border-stone-200 focus:bg-white focus:ring-0 focus:border-[#a2c1b1] transition-all rounded-[20px] font-bold text-stone-700"
                                        value={formData.full_name || ""}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-4">
                                    <Label className="text-sm font-black text-stone-800 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1 h-3 bg-[#b388c6] rounded-full" /> Avatar Seçimi
                                    </Label>
                                    <div className="flex flex-wrap gap-3">
                                        {NEUTRAL_AVATARS.map((url, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, avatar_url: url })}
                                                className={cn(
                                                    "w-12 h-12 rounded-2xl border-2 transition-all hover:scale-110 p-0.5 overflow-hidden",
                                                    formData.avatar_url === url ? "border-[#7b9e89] bg-[#eaf2ed] shadow-lg shadow-[#7b9e89]/20 font-bold" : "border-stone-100 bg-stone-50"
                                                )}
                                            >
                                                <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label htmlFor="bio" className="text-sm font-black text-stone-800 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1 h-3 bg-[#7b9e89] rounded-full" /> Biyografi
                                </Label>
                                <Textarea
                                    id="bio"
                                    className="h-32 bg-stone-50 border-stone-200 focus:bg-white focus:ring-0 focus:border-[#a2c1b1] transition-all rounded-[20px] font-medium text-stone-700 p-6"
                                    value={formData.bio || ""}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    placeholder="Kendinizden bahsedin..."
                                />
                            </div>

                            <div className="space-y-4">
                                <Label htmlFor="special_note" className="text-sm font-black text-stone-800 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1 h-3 bg-[#b388c6] rounded-full" /> {profile.role === 'teacher' ? 'Uzmanlık Alanı / Detaylar' : 'Özel Notlar'}
                                </Label>
                                <Textarea
                                    id="special_note"
                                    className="h-40 bg-stone-50 border-stone-200 focus:bg-white focus:ring-0 focus:border-[#d4bbee] transition-all rounded-[20px] font-medium text-stone-700 p-6"
                                    value={formData.special_note || ""}
                                    onChange={(e) => setFormData({ ...formData, special_note: e.target.value })}
                                    placeholder="Projelerinize veya belirtmek istediğiniz detaylara yer verin..."
                                />
                            </div>

                            <div className="pt-6 border-t border-stone-100/80">
                                <Label className="text-sm font-black text-stone-800 uppercase tracking-widest flex items-center gap-2 mb-6">
                                    <div className="w-1 h-3 bg-[#7b9e89] rounded-full" /> Sosyal Medya & Bağlantılar
                                </Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2 text-xs font-bold text-stone-400 uppercase tracking-widest">
                                            <Instagram className="h-4 w-4" /> Instagram
                                        </Label>
                                        <Input
                                            placeholder="@kullanici_adi"
                                            className="h-12 bg-stone-50 border-stone-200 rounded-2xl"
                                            value={getSocialLinks(formData).instagram}
                                            onChange={(e) => updateSocialLink('instagram', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2 text-xs font-bold text-stone-400 uppercase tracking-widest">
                                            <Twitter className="h-4 w-4" /> Twitter (X)
                                        </Label>
                                        <Input
                                            placeholder="@kullanici_adi"
                                            className="h-12 bg-stone-50 border-stone-200 rounded-2xl"
                                            value={getSocialLinks(formData).twitter}
                                            onChange={(e) => updateSocialLink('twitter', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2 text-xs font-bold text-stone-400 uppercase tracking-widest">
                                            <Facebook className="h-4 w-4" /> Facebook
                                        </Label>
                                        <Input
                                            placeholder="Profil linki veya ad"
                                            className="h-12 bg-stone-50 border-stone-200 rounded-2xl"
                                            value={getSocialLinks(formData).facebook}
                                            onChange={(e) => updateSocialLink('facebook', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2 text-xs font-bold text-stone-400 uppercase tracking-widest">
                                            <Music className="h-4 w-4" /> Spotify
                                        </Label>
                                        <Input
                                            placeholder="Spotify profil linki"
                                            className="h-12 bg-stone-50 border-stone-200 rounded-2xl"
                                            value={getSocialLinks(formData).spotify}
                                            onChange={(e) => updateSocialLink('spotify', e.target.value)}
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <Label className="flex items-center gap-2 text-xs font-bold text-stone-400 uppercase tracking-widest">
                                            <Globe className="h-4 w-4" /> Web Sitesi / Diğer
                                        </Label>
                                        <Input
                                            placeholder="https://yourwebsite.com"
                                            className="h-12 bg-stone-50 border-stone-200 rounded-2xl"
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
                                    className="bg-stone-900 hover:bg-stone-800 text-white rounded-2xl px-10 h-12 font-bold shadow-xl transition-all hover:-translate-y-1"
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
                                <TabsList className="flex items-center bg-stone-100/50 p-2 rounded-[24px] mb-10 w-fit mx-auto lg:mx-0">
                                    <TabsTrigger value="about" className="rounded-2xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:text-[#7b9e89] data-[state=active]:shadow-sm font-black text-sm uppercase tracking-widest transition-all">Hakkında</TabsTrigger>
                                    <TabsTrigger value="bookmarks" className="rounded-2xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:text-[#7b9e89] data-[state=active]:shadow-sm font-black text-sm uppercase tracking-widest transition-all">Kaydedilenler</TabsTrigger>
                                    <TabsTrigger value="portfolio" className="rounded-2xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:text-[#7b9e89] data-[state=active]:shadow-sm font-black text-sm uppercase tracking-widest transition-all">Portföyüm</TabsTrigger>
                                </TabsList>

                                <TabsContent value="about" className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="bg-white p-10 rounded-[40px] shadow-[0_15px_40px_rgba(0,0,0,0.03)] border border-stone-100 flex flex-col h-full">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="w-1.5 h-6 bg-[#7b9e89] rounded-full" />
                                                <h3 className="text-sm font-black text-stone-800 uppercase tracking-widest">Biyografi</h3>
                                            </div>
                                            <div className="flex-1 text-stone-600 leading-relaxed font-medium">
                                                {profile.bio || <span className="text-stone-300 italic">Biyografi eklenmemiş.</span>}
                                            </div>
                                        </div>

                                        <div className="bg-stone-50/50 p-10 rounded-[40px] border border-stone-100/80 flex flex-col h-full">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="w-1.5 h-6 bg-[#b388c6] rounded-full" />
                                                <h3 className="text-sm font-black text-stone-800 uppercase tracking-widest">
                                                    {profile.role === 'teacher' ? 'Uzmanlık Alanı' : 'Özel Notlar'}
                                                </h3>
                                            </div>
                                            <div className="flex-1 text-stone-600 leading-relaxed font-medium">
                                                {profile.special_note || <span className="text-stone-300 italic">Not bulunmuyor.</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Social Links */}
                                    {profile.social_links && Object.values(profile.social_links).some(v => v) && (
                                        <div className="p-8 bg-white rounded-[40px] shadow-[0_10px_30px_rgba(0,0,0,0.02)] border border-stone-50">
                                            <div className="flex flex-wrap justify-center gap-6">
                                                {profile.social_links.instagram && (
                                                    <a href={profile.social_links.instagram.startsWith('http') ? profile.social_links.instagram : `https://instagram.com/${profile.social_links.instagram}`} target="_blank" rel="noopener" className="flex items-center gap-3 text-stone-400 hover:text-pink-500 transition-colors font-black text-xs uppercase tracking-widest">
                                                        <Instagram className="h-5 w-5" /> Instagram
                                                    </a>
                                                )}
                                                {profile.social_links.twitter && (
                                                    <a href={profile.social_links.twitter.startsWith('http') ? profile.social_links.twitter : `https://twitter.com/${profile.social_links.twitter}`} target="_blank" rel="noopener" className="flex items-center gap-3 text-stone-400 hover:text-[#7b9e89] transition-colors font-black text-xs uppercase tracking-widest">
                                                        <Twitter className="h-4 w-4" /> X / Twitter
                                                    </a>
                                                )}
                                                {profile.social_links.facebook && (
                                                    <a href={profile.social_links.facebook} target="_blank" rel="noopener" className="flex items-center gap-3 text-stone-400 hover:text-blue-600 transition-colors font-black text-xs uppercase tracking-widest">
                                                        <Facebook className="h-5 w-5" /> Facebook
                                                    </a>
                                                )}
                                                {profile.social_links.website && (
                                                    <a href={profile.social_links.website} target="_blank" rel="noopener" className="flex items-center gap-3 text-stone-400 hover:text-[#7b9e89] transition-colors font-black text-xs uppercase tracking-widest">
                                                        <Globe className="h-5 w-5" /> Web Sitesi
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="bookmarks" className="animate-in fade-in slide-in-from-bottom-5 duration-700">
                                    {loadingBookmarks ? (
                                        <div className="py-24 flex flex-col items-center gap-6">
                                            <div className="w-12 h-12 border-4 border-[#7b9e89] border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-stone-300 font-black text-xs uppercase tracking-widest">Kayıtlar Hazırlanıyor...</p>
                                        </div>
                                    ) : (bookmarkedPosts.length === 0 && bookmarkedArticles.length === 0) ? (
                                        <div className="bg-white rounded-[40px] border border-stone-100 p-20 text-center">
                                            <div className="mx-auto w-24 h-24 bg-stone-50 rounded-[30px] flex items-center justify-center mb-6">
                                                <Bookmark className="h-10 w-10 text-stone-200" />
                                            </div>
                                            <h3 className="text-xl font-black text-stone-800 mb-2">Henüz bir şey kaydetmediniz</h3>
                                            <p className="text-stone-400 font-medium text-sm">Beğendiğiniz içerikleri buraya ekleyerek daha sonra kolayca ulaşabilirsiniz.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-1 h-5 bg-[#7b9e89] rounded-full" />
                                                    <h3 className="text-xs font-black text-stone-700 uppercase tracking-[0.2em]">Makaleler</h3>
                                                </div>
                                                {bookmarkedArticles.map(art => (
                                                    <div key={art.id} className="p-6 bg-white rounded-[32px] border border-stone-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                                                        <a href={`/knowledge/${art.id}`} className="flex-1 min-w-0">
                                                            <h4 className="font-bold text-stone-800 group-hover:text-[#7b9e89] transition-colors truncate">{art.title}</h4>
                                                            <p className="text-xs text-stone-400 mt-1">{art.author?.full_name}</p>
                                                        </a>
                                                        <ExternalLink className="h-4 w-4 text-stone-200 group-hover:text-[#7b9e89] transition-all" />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-1 h-5 bg-[#b388c6] rounded-full" />
                                                    <h3 className="text-xs font-black text-stone-700 uppercase tracking-[0.2em]">Gönderiler</h3>
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
                <div className="mt-24 pt-10 border-t border-stone-100 flex justify-center">
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
