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
import { ShieldCheck, Loader2, LogOut, Save, Copy, Check, X, Edit2, Instagram, Twitter, Facebook, Globe, Music, ExternalLink, Bookmark, Clock, Camera } from "lucide-react";
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
    cover_url: string | null;
    gender: 'male' | 'female' | 'other' | null;
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

    const [stats, setStats] = useState({ posts: 0, articles: 0, connections: 0 });
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [usernameInput, setUsernameInput] = useState("");
    const [usernameLoading, setUsernameLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<Profile>>({});

    const getSocialLinks = (profileData: Partial<Profile>) => ({
        instagram: profileData.social_links?.instagram || "",
        twitter: profileData.social_links?.twitter || "",
        facebook: profileData.social_links?.facebook || "",
        spotify: profileData.social_links?.spotify || "",
        website: profileData.social_links?.website || "",
    });

    const getDefaultAvatar = (gender: Profile['gender']) => {
        if (gender === 'male') return "https://api.dicebear.com/9.x/notionists/svg?seed=Felix&backgroundColor=b6e3f4";
        if (gender === 'female') return "https://api.dicebear.com/9.x/notionists/svg?seed=Anita&backgroundColor=ffd5dc";
        return "https://api.dicebear.com/9.x/notionists/svg?seed=Oliver&backgroundColor=f1f5f9";
    };

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await createClient().auth.getUser();
            if (!user) { router.push("/login"); return; }

            const { data, error } = await createClient()
                .from("profiles").select("*").eq("id", user.id).single();

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

            const { data: postBookmarks } = await createClient()
                .from("bookmarks").select("item_id, created_at")
                .eq("user_id", user.id).eq("item_type", "post")
                .order("created_at", { ascending: false });

            if (postBookmarks && postBookmarks.length > 0) {
                const postIds = postBookmarks.map((b: { item_id: string }) => b.item_id);
                const { data: postsData } = await createClient()
                    .from("posts")
                    .select(`id, content, is_anonymous, likes_count, comments_count, created_at, category, image_url, author_id, profiles!posts_author_id_fkey (id, full_name, avatar_url, is_verified_expert)`)
                    .in("id", postIds);

                if (postsData) {
                    const { data: likesData } = await createClient()
                        .from("post_likes").select("post_id")
                        .eq("user_id", user.id).in("post_id", postIds);
                    const likedPostIds = new Set(likesData?.map((l: { post_id: string }) => l.post_id) || []);
                    const ordered = postIds
                        .map((id: string) => postsData.find((p: any) => p.id === id))
                        .filter(Boolean)
                        .map((p: any) => ({ ...p, profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles, user_has_bookmarked: true, user_has_liked: likedPostIds.has(p.id) }));
                    setBookmarkedPosts(ordered);
                }
            } else { setBookmarkedPosts([]); }

            const { data: artBookmarks } = await createClient()
                .from("bookmarks").select("item_id, created_at")
                .eq("user_id", user.id).eq("item_type", "article")
                .order("created_at", { ascending: false });

            if (artBookmarks && artBookmarks.length > 0) {
                const articleIds = artBookmarks.map((b: { item_id: string }) => b.item_id);
                const { data: articlesData } = await createClient()
                    .from("articles")
                    .select(`id, title, summary, category, created_at, author_id, author:author_id ( full_name, avatar_url )`)
                    .in("id", articleIds);
                if (articlesData) {
                    const ordered = articleIds
                        .map((id: string) => articlesData.find((a: any) => a.id === id))
                        .filter(Boolean)
                        .map((a: any) => ({ ...a, author: Array.isArray(a.author) ? a.author[0] : a.author }));
                    setBookmarkedArticles(ordered);
                }
            } else { setBookmarkedArticles([]); }
            setLoadingBookmarks(false);
        };

        const fetchStats = async () => {
            const { data: { user } } = await createClient().auth.getUser();
            if (!user) return;
            const { count: postsCount } = await createClient().from("posts").select("*", { count: 'exact', head: true }).eq("author_id", user.id);
            const { count: articlesCount } = await createClient().from("articles").select("*", { count: 'exact', head: true }).eq("author_id", user.id);
            const { count: connectionsCount } = await createClient().from("connection_requests").select("*", { count: 'exact', head: true }).eq("status", "accepted").or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
            setStats({ posts: postsCount || 0, articles: articlesCount || 0, connections: connectionsCount || 0 });
        };

        fetchProfile();
        fetchBookmarks();
        fetchStats();
    }, [router]);

    const handleSave = async () => {
        if (!profile) return;
        setSaving(true);
        try {
            const { error } = await createClient().from("profiles").update({
                full_name: formData.full_name, bio: formData.bio, special_note: formData.special_note,
                avatar_url: formData.avatar_url, cover_url: formData.cover_url, gender: formData.gender,
                social_links: formData.social_links
            }).eq("id", profile.id);
            if (error) throw error;
            setProfile({ ...profile, ...formData } as Profile);
            setIsEditing(false);
            toast.success("Profil bilgileri başarıyla güncellendi!");
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Güncelleme sırasında bir hata oluştu: " + (error as Error).message);
        } finally { setSaving(false); }
    };

    const handleUsernameUpdate = async () => {
        if (!profile || !usernameInput.trim()) return;
        if (usernameInput.length < 3) { toast.warning("Kullanıcı adı en az 3 karakter olmalıdır."); return; }
        if (usernameInput === profile.username) { setIsEditingUsername(false); return; }
        setUsernameLoading(true);
        try {
            const { data, error } = await createClient().rpc('update_username', { new_username: usernameInput, user_id: profile.id });
            if (error) throw error;
            if (data.success) { toast.success(data.message); setProfile({ ...profile, username: usernameInput } as Profile); setIsEditingUsername(false); }
            else { toast.error(data.message); }
        } catch (error) { console.error("Error updating username:", error); toast.error("Hata: " + (error as Error).message); }
        finally { setUsernameLoading(false); }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
        const file = e.target.files?.[0];
        if (!file || !profile) return;
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4'];
        if (!allowedTypes.includes(file.type)) { toast.error("Yalnızca JPEG, PNG, WEBP, GIF ve MP4 dosyaları yüklenebilir."); return; }
        setSaving(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${profile.id}/${type}_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await createClient().storage.from('profile-assets').upload(fileName, file, { upsert: true });
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = createClient().storage.from('profile-assets').getPublicUrl(fileName);
            const updateData = type === 'avatar' ? { avatar_url: publicUrl } : { cover_url: publicUrl };
            const { error: updateError } = await createClient().from('profiles').update(updateData).eq('id', profile.id);
            if (updateError) throw updateError;
            setProfile(prev => prev ? { ...prev, ...updateData } : null);
            setFormData(prev => ({ ...prev, ...updateData }));
            toast.success(`${type === 'avatar' ? 'Profil fotoğrafı' : 'Kapak fotoğrafı'} güncellendi!`);
        } catch (error) { console.error("Upload error:", error); toast.error("Yükleme sırasında bir hata oluştu."); }
        finally { setSaving(false); }
    };

    const handleLogout = async () => { await createClient().auth.signOut(); router.push("/login"); };

    const updateSocialLink = (platform: string, value: string) => {
        setFormData(prev => ({ ...prev, social_links: { ...prev.social_links, [platform]: value } }));
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
            <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-8 pb-24 md:pb-8">

                {/* Profile Header Card */}
                <div className="bg-white rounded-[28px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100/80 overflow-hidden mb-6">
                    {/* Cover Area */}
                    <div className="h-40 md:h-48 relative group/banner">
                        {profile.cover_url ? (
                            profile.cover_url.endsWith('.mp4') ? (
                                <video src={profile.cover_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                            ) : (
                                <img src={profile.cover_url} alt="Kapak" className="w-full h-full object-cover" />
                            )
                        ) : (
                            <div className="w-full h-full gradient-brand opacity-80"></div>
                        )}

                        {/* Cover Upload */}
                        <label className="absolute top-3 right-3 cursor-pointer opacity-0 group-hover/banner:opacity-100 transition-opacity z-10">
                            <div className="bg-white/90 backdrop-blur-sm p-2.5 rounded-xl shadow-md border border-white/60 hover:bg-white transition-all">
                                <Camera className="w-4 h-4 text-gray-600" />
                            </div>
                            <input type="file" className="hidden" accept="image/*,video/mp4" onChange={(e) => handleUpload(e, 'cover')} />
                        </label>

                        {/* Edit Profile Button — Always Visible */}
                        <div className="absolute top-3 right-16 md:right-16 z-10">
                            <Button
                                onClick={() => setIsEditing(true)}
                                size="sm"
                                className="bg-white/90 backdrop-blur-sm hover:bg-white text-gray-700 rounded-xl px-4 h-10 font-semibold border border-white/60 shadow-md transition-all text-sm"
                            >
                                <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Düzenle
                            </Button>
                        </div>

                        {/* Avatar */}
                        <div className="absolute -bottom-14 left-5 md:left-8 group/avatar">
                            <div className="relative">
                                <Avatar className="h-28 w-28 border-4 border-white shadow-lg bg-white">
                                    <AvatarImage src={profile.avatar_url || getDefaultAvatar(profile.gender)} className="object-cover" />
                                    <AvatarFallback className="text-2xl font-bold bg-gray-50 text-gray-300">
                                        {profile.full_name?.[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <label className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer rounded-full">
                                    <Camera className="w-6 h-6 text-white" />
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'avatar')} />
                                </label>
                                {profile.verification_status === 'approved' && (
                                    <div className="absolute bottom-1 right-1 bg-white rounded-full p-0.5 shadow-md z-10">
                                        <ShieldCheck className="w-5 h-5 text-[#0c9789]" fill="currentColor" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Profile Info */}
                    <div className="pt-16 pb-6 px-5 md:px-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                        <div className="flex-1 space-y-3">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">{profile.full_name}</h2>
                                <span className="px-2.5 py-0.5 rounded-full bg-[#f0fdfa] text-[#0c9789] text-xs font-semibold">
                                    {profile.role === 'teacher' ? 'Eğitmen' : profile.role === 'parent' ? 'Ebeveyn' : 'Öğrenci'}
                                </span>
                            </div>

                            {/* Username */}
                            <div className="flex flex-col gap-1">
                                {isEditingUsername ? (
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">@</span>
                                            <Input
                                                value={usernameInput}
                                                onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                                className="h-9 pl-7 pr-3 bg-gray-50 border-gray-200 focus:bg-white focus:border-[#0c9789] rounded-xl text-sm font-medium text-gray-700 w-44"
                                                placeholder="kullanici_adi"
                                                disabled={usernameLoading}
                                                autoFocus
                                            />
                                        </div>
                                        <Button size="icon" variant="ghost" onClick={handleUsernameUpdate} disabled={usernameLoading}
                                            className="h-9 w-9 rounded-xl bg-[#f0fdfa] text-[#0c9789] hover:bg-[#0c9789] hover:text-white transition-all">
                                            {usernameLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => setIsEditingUsername(false)} disabled={usernameLoading}
                                            className="h-9 w-9 rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all">
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => { setUsernameInput(profile.username || ""); setIsEditingUsername(true); }}>
                                        <span className={cn("text-sm font-medium transition-colors", profile.username ? "text-gray-400 group-hover:text-gray-600" : "text-[#0c9789] animate-pulse")}>
                                            @{profile.username || 'kullanici_adi_olustur'}
                                        </span>
                                        <button className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-gray-400 hover:text-[#0c9789] transition-all">
                                            <Edit2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                                    <Clock className="w-3.5 h-3.5 text-[#0c9789]" />
                                    {format(new Date(profile.created_at), "MMMM yyyy", { locale: tr })}'den beri üye
                                </div>
                            </div>

                            {profile.bio && (
                                <p className="text-gray-500 text-sm font-medium max-w-xl leading-relaxed">{profile.bio}</p>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-6 sm:gap-10 bg-gray-50/80 px-5 py-4 rounded-2xl border border-gray-100/60">
                            <div className="text-center">
                                <div className="text-xl font-bold text-gray-900">{stats.posts}</div>
                                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">Gönderi</div>
                            </div>
                            <div className="w-px h-8 bg-gray-200"></div>
                            <div className="text-center">
                                <div className="text-xl font-bold text-gray-900">{stats.articles}</div>
                                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">Makale</div>
                            </div>
                            <div className="w-px h-8 bg-gray-200"></div>
                            <div className="text-center">
                                <div className="text-xl font-bold text-gray-900">{stats.connections}</div>
                                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">Bağlantı</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-6">
                    {isEditing ? (
                        <div className="bg-white rounded-[28px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100/80 p-6 md:p-8 space-y-6 animate-fade-up">
                            {/* Form Header */}
                            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900 tracking-tight">Profili Düzenle</h3>
                                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600 rounded-xl">
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <Label htmlFor="fullname" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tam Ad Soyad</Label>
                                    <Input id="fullname" className="h-11 bg-gray-50 border-gray-200 focus:bg-white focus:border-[#0c9789] rounded-xl text-sm font-medium text-gray-700"
                                        value={formData.full_name || ""} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cinsiyet</Label>
                                    <div className="flex gap-2">
                                        {[
                                            { value: 'male' as const, label: 'Erkek', color: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-300' },
                                            { value: 'female' as const, label: 'Kadın', color: '#ec4899', bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-300' },
                                            { value: 'other' as const, label: 'Diğer', color: '#6b7280', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
                                        ].map((g) => (
                                            <button key={g.value} type="button"
                                                onClick={() => setFormData({ ...formData, gender: g.value })}
                                                className={cn(
                                                    "flex-1 h-11 rounded-xl border transition-all flex items-center justify-center gap-1.5 text-sm font-semibold",
                                                    formData.gender === g.value
                                                        ? `${g.border} ${g.bg} ${g.text} shadow-sm`
                                                        : "border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100"
                                                )}>
                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g.color }} />
                                                {g.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bio" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Biyografi</Label>
                                <Textarea id="bio" className="min-h-[100px] bg-gray-50 border-gray-200 focus:bg-white focus:border-[#0c9789] rounded-xl text-sm font-medium text-gray-700 p-4"
                                    value={formData.bio || ""} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder="Kendinizden bahsedin..." />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="special_note" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {profile.role === 'teacher' ? 'Uzmanlık Alanı / Detaylar' : 'Özel Notlar'}
                                </Label>
                                <Textarea id="special_note" className="min-h-[120px] bg-gray-50 border-gray-200 focus:bg-white focus:border-[#0c9789] rounded-xl text-sm font-medium text-gray-700 p-4"
                                    value={formData.special_note || ""} onChange={(e) => setFormData({ ...formData, special_note: e.target.value })}
                                    placeholder="Projelerinize veya belirtmek istediğiniz detaylara yer verin..." />
                            </div>

                            {/* Social Links */}
                            <div className="pt-4 border-t border-gray-100">
                                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 block">Sosyal Medya & Bağlantılar</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { key: 'instagram', icon: Instagram, label: 'Instagram', placeholder: '@kullanici_adi' },
                                        { key: 'twitter', icon: Twitter, label: 'Twitter (X)', placeholder: '@kullanici_adi' },
                                        { key: 'facebook', icon: Facebook, label: 'Facebook', placeholder: 'Profil linki veya ad' },
                                        { key: 'spotify', icon: Music, label: 'Spotify', placeholder: 'Spotify profil linki' },
                                    ].map(({ key, icon: Icon, label, placeholder }) => (
                                        <div key={key} className="space-y-1.5">
                                            <Label className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                                                <Icon className="h-3.5 w-3.5" /> {label}
                                            </Label>
                                            <Input placeholder={placeholder} className="h-10 bg-gray-50 border-gray-200 rounded-xl text-sm"
                                                value={getSocialLinks(formData)[key as keyof ReturnType<typeof getSocialLinks>]}
                                                onChange={(e) => updateSocialLink(key, e.target.value)} />
                                        </div>
                                    ))}
                                    <div className="md:col-span-2 space-y-1.5">
                                        <Label className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                                            <Globe className="h-3.5 w-3.5" /> Web Sitesi / Diğer
                                        </Label>
                                        <Input placeholder="https://yourwebsite.com" className="h-10 bg-gray-50 border-gray-200 rounded-xl text-sm"
                                            value={getSocialLinks(formData).website} onChange={(e) => updateSocialLink('website', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="ghost" onClick={() => setIsEditing(false)} className="rounded-xl px-6 h-10 font-semibold text-sm">İptal</Button>
                                <Button onClick={handleSave} disabled={saving}
                                    className="bg-[#0c9789] hover:bg-[#0a7c70] text-white rounded-xl px-6 h-10 font-semibold shadow-sm transition-all text-sm">
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                                    Kaydet
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {profile.role === 'teacher' && profile.verification_status && (
                                <VerificationStatus userId={profile.id} role={profile.role} status={profile.verification_status}
                                    onStatusChange={(newStatus) => setProfile(prev => prev ? { ...prev, verification_status: newStatus } : null)} />
                            )}

                            <Tabs defaultValue="about" className="w-full">
                                <TabsList className="bg-transparent border-b border-gray-100 w-full justify-start h-auto p-0 rounded-none mb-6 overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide flex-nowrap">
                                    {[
                                        { value: 'about', label: 'Hakkında' },
                                        { value: 'posts', label: 'Gönderiler' },
                                        { value: 'bookmarks', label: 'Kaydedilenler' },
                                        { value: 'portfolio', label: 'Portfolyo' },
                                    ].map(tab => (
                                        <TabsTrigger key={tab.value} value={tab.value}
                                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#0c9789] data-[state=active]:bg-transparent data-[state=active]:text-[#0c9789] px-5 md:px-6 py-3 font-semibold text-sm transition-all">
                                            {tab.label}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>

                                <TabsContent value="about" className="animate-fade-up">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                        {/* Left Column */}
                                        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                                            {/* Personal Info */}
                                            <div className="bg-white p-5 md:p-8 rounded-[28px] border border-gray-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1 h-5 bg-[#0c9789] rounded-full"></div>
                                                    <h3 className="text-sm font-bold text-gray-900">Kişisel Bilgiler</h3>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-6">
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Tam Ad</div>
                                                        <div className="text-sm font-bold text-gray-800">{profile.full_name}</div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Rol</div>
                                                        <div className="text-sm font-bold text-gray-800">
                                                            {profile.role === 'teacher' ? 'Eğitim Uzmanı' : profile.role === 'parent' ? 'Ebeveyn' : 'Öğrenci'}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Kimlik</div>
                                                        <div className="text-sm font-bold text-[#0c9789] flex items-center gap-1">
                                                            #{profile.custom_id}
                                                            <Copy className="w-3 h-3 opacity-40 cursor-pointer hover:opacity-100 transition-opacity" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1 sm:col-span-2">
                                                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">E-posta</div>
                                                        <div className="text-sm font-bold text-gray-800">{profile.email || '—'}</div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Konum</div>
                                                        <div className="text-sm font-bold text-gray-800">Türkiye</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bio */}
                                            <div className="bg-white p-5 md:p-8 rounded-[28px] border border-gray-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1 h-5 bg-[#0c9789] rounded-full"></div>
                                                    <h3 className="text-sm font-bold text-gray-900">Biyografi</h3>
                                                </div>
                                                <p className="text-gray-500 text-sm font-medium leading-relaxed bg-gray-50/50 p-5 rounded-2xl border border-dashed border-gray-200 italic">
                                                    &ldquo;{profile.bio || "Biyografi henüz doldurulmamış."}&rdquo;
                                                </p>
                                            </div>
                                        </div>

                                        {/* Right Column */}
                                        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
                                            {/* Social Links */}
                                            <div className="bg-white p-5 md:p-6 rounded-[28px] border border-gray-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1 h-4 bg-[#0c9789] rounded-full"></div>
                                                    <h3 className="text-xs font-bold text-gray-900">Sosyal Bağlantılar</h3>
                                                </div>
                                                <div className="flex flex-wrap gap-3">
                                                    {profile.social_links?.website && (
                                                        <a href={profile.social_links.website} target="_blank" rel="noopener"
                                                            className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-[#0c9789] hover:bg-[#f0fdfa] transition-all border border-gray-100">
                                                            <Globe className="w-5 h-5" />
                                                        </a>
                                                    )}
                                                    {profile.social_links?.instagram && (
                                                        <a href={`https://instagram.com/${profile.social_links.instagram.replace('@', '')}`} target="_blank" rel="noopener"
                                                            className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-pink-500 hover:bg-pink-50 transition-all border border-gray-100">
                                                            <Instagram className="w-5 h-5" />
                                                        </a>
                                                    )}
                                                    {profile.social_links?.twitter && (
                                                        <a href={`https://twitter.com/${profile.social_links.twitter.replace('@', '')}`} target="_blank" rel="noopener"
                                                            className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-[#1DA1F2] hover:bg-blue-50 transition-all border border-gray-100">
                                                            <Twitter className="w-5 h-5" />
                                                        </a>
                                                    )}
                                                    {!profile.social_links?.website && !profile.social_links?.instagram && !profile.social_links?.twitter && (
                                                        <p className="text-xs text-gray-400 font-medium">Henüz bağlantı eklenmemiş.</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Badges */}
                                            <div className="bg-white p-5 md:p-6 rounded-[28px] border border-gray-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1 h-4 bg-[#0c9789] rounded-full"></div>
                                                    <h3 className="text-xs font-bold text-gray-900">Rozetler</h3>
                                                </div>
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50/80 border border-gray-100/50 hover:bg-white hover:shadow-sm transition-all">
                                                        <div className="w-10 h-10 rounded-xl bg-[#f0fdfa] flex items-center justify-center text-[#0c9789] flex-shrink-0">
                                                            <ShieldCheck className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-semibold text-gray-900">Doğrulanmış Üye</div>
                                                            <div className="text-[10px] text-gray-400 font-medium">Kimlik doğrulaması tamamlandı</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50/80 border border-gray-100/50 hover:bg-white hover:shadow-sm transition-all">
                                                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 flex-shrink-0">
                                                            <Edit2 className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-semibold text-gray-900">İlk Gönderi</div>
                                                            <div className="text-[10px] text-gray-400 font-medium">Topluluğa ilk katkı</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="posts" className="animate-fade-up">
                                    <div className="max-w-2xl mx-auto space-y-6 mt-4">
                                        <p className="text-center text-gray-400 font-medium py-12 text-sm">Gönderileriniz burada listelenecek.</p>
                                    </div>
                                </TabsContent>

                                <TabsContent value="bookmarks" className="animate-fade-up">
                                    {loadingBookmarks ? (
                                        <div className="py-20 flex flex-col items-center gap-4">
                                            <div className="w-10 h-10 border-3 border-[#0c9789] border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-gray-400 text-xs font-semibold">Yükleniyor...</p>
                                        </div>
                                    ) : (bookmarkedPosts.length === 0 && bookmarkedArticles.length === 0) ? (
                                        <div className="bg-white rounded-[28px] border border-gray-100/80 p-16 text-center shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
                                            <div className="mx-auto w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                                                <Bookmark className="h-7 w-7 text-gray-200" />
                                            </div>
                                            <h3 className="text-base font-bold text-gray-800 mb-1">Henüz bir şey kaydetmediniz</h3>
                                            <p className="text-gray-400 text-sm font-medium">Beğendiğiniz içerikleri buraya ekleyin.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="w-1 h-4 bg-[#0c9789] rounded-full" />
                                                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Makaleler</h3>
                                                </div>
                                                {bookmarkedArticles.map(art => (
                                                    <div key={art.id} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                                                        <a href={`/knowledge/${art.id}`} className="flex-1 min-w-0">
                                                            <h4 className="font-semibold text-sm text-gray-800 group-hover:text-[#0c9789] transition-colors truncate">{art.title}</h4>
                                                            <p className="text-xs text-gray-400 mt-0.5">{art.author?.full_name}</p>
                                                        </a>
                                                        <ExternalLink className="h-3.5 w-3.5 text-gray-200 group-hover:text-[#0c9789] transition-all flex-shrink-0 ml-2" />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="w-1 h-4 bg-[#0c9789] rounded-full" />
                                                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Gönderiler</h3>
                                                </div>
                                                {bookmarkedPosts.map(post => (
                                                    <PostItem key={post.id} post={post} currentUserId={profile.id} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="portfolio" className="animate-fade-up">
                                    <PortfolioTab userId={profile.id} isOwner={true} role={profile.role} />
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}
                </div>

                {/* Logout */}
                <div className="mt-16 pt-6 border-t border-gray-100 flex justify-center">
                    <Button variant="ghost" onClick={handleLogout}
                        className="text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl font-semibold text-xs px-6">
                        <LogOut className="h-4 w-4 mr-1.5" /> Oturumu Kapat
                    </Button>
                </div>
            </div>
        </AppShell>
    );
}
