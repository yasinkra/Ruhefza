"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle, ShieldCheck, Clock, Globe, Instagram, Twitter, Music, ExternalLink, BookOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import Link from "next/link";
import { PortfolioTab } from "@/components/profile/PortfolioTab";
import { cn } from "@/utils/cn";

interface PublicProfile {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string | null;
    bio: string | null;
    special_note: string | null;
    verification_status: string | null;
    is_verified_expert: boolean;
    custom_id: number | null;
    username: string | null;
    created_at: string;
    social_links: {
        instagram?: string;
        twitter?: string;
        spotify?: string;
        website?: string;
    } | null;
}

type ConnectionStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'self';

export default function PublicProfilePage() {
    const params = useParams();
    const router = useRouter();
    const profileId = params?.id as string;

    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('none');
    const [connectionId, setConnectionId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'hakkinda' | 'portfolyo'>('hakkinda');

    useEffect(() => {
        if (!profileId) return;

        const init = async () => {
            const { data: { user } } = await createClient().auth.getUser();
            const uid = user?.id || null;
            setCurrentUserId(uid);

            const { data, error } = await createClient()
                .from("profiles")
                .select("id, full_name, avatar_url, role, bio, special_note, verification_status, is_verified_expert, custom_id, username, created_at, social_links")
                .eq("id", profileId)
                .single();

            if (error || !data) { setLoading(false); return; }
            setProfile(data);

            if (!uid) { setLoading(false); return; }

            if (uid === profileId) {
                setConnectionStatus('self');
                setLoading(false);
                return;
            }

            const { data: req } = await createClient()
                .from("connection_requests")
                .select("id, sender_id, receiver_id, status")
                .or(`and(sender_id.eq.${uid},receiver_id.eq.${profileId}),and(sender_id.eq.${profileId},receiver_id.eq.${uid})`)
                .maybeSingle();

            if (req) {
                setConnectionId(req.id);
                if (req.status === 'accepted') setConnectionStatus('accepted');
                else if (req.status === 'pending') {
                    setConnectionStatus(req.sender_id === uid ? 'pending_sent' : 'pending_received');
                }
            }
            setLoading(false);
        };

        init();
    }, [profileId]);

    const handleConnect = async () => {
        if (!currentUserId) { router.push('/login'); return; }
        setActionLoading(true);
        const { error } = await createClient().from("connection_requests").insert({
            sender_id: currentUserId,
            receiver_id: profileId,
            status: "pending"
        });
        if (error) toast.error("İstek gönderilemedi: " + error.message);
        else { toast.success("Bağlantı isteği gönderildi!"); setConnectionStatus('pending_sent'); }
        setActionLoading(false);
    };

    const handleAccept = async () => {
        if (!connectionId) return;
        setActionLoading(true);
        await createClient().from("connection_requests")
            .update({ status: "accepted", responded_at: new Date().toISOString() })
            .eq("id", connectionId);
        toast.success("Bağlantı kabul edildi!");
        setConnectionStatus('accepted');
        setActionLoading(false);
    };

    const handleMessage = async () => {
        if (!currentUserId) { router.push('/login'); return; }
        const { data: convId } = await createClient().rpc("get_or_create_conversation", {
            user_a: currentUserId,
            user_b: profileId
        });
        if (convId) router.push(`/messages?userId=${profileId}`);
    };

    if (loading) return (
        <AppShell>
            <div className="max-w-2xl mx-auto px-4 py-12 animate-pulse">
                <div className="h-8 w-32 bg-slate-200 rounded mb-8"></div>
                <div className="flex items-center gap-5 mb-8">
                    <div className="h-20 w-20 bg-slate-200 rounded-full shrink-0"></div>
                    <div className="flex-1 space-y-3">
                        <div className="h-6 w-48 bg-slate-200 rounded"></div>
                        <div className="h-4 w-32 bg-slate-100 rounded"></div>
                    </div>
                </div>
            </div>
        </AppShell>
    );

    if (!profile) return (
        <AppShell>
            <div className="max-w-2xl mx-auto px-4 py-12 text-center">
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Profil Bulunamadı</h1>
                <p className="text-slate-400 mb-6">Bu kullanıcı mevcut değil veya profili gizlidir.</p>
                <Link href="/" className="text-teal-600 underline">Ana sayfaya dön</Link>
            </div>
        </AppShell>
    );

    return (
        <AppShell>
            <div className="max-w-4xl mx-auto px-4 py-8 pb-20">
                {/* Back Link */}
                <button onClick={() => router.back()}
                    className="flex items-center gap-2 text-stone-400 hover:text-stone-800 mb-8 transition-all group">
                    <div className="p-2 rounded-full bg-stone-100 group-hover:bg-white group-hover:shadow-sm transition-all">
                        <ArrowLeft className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-bold">Geri Dön</span>
                </button>

                {/* Profile Header Card */}
                <div className="bg-white rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-stone-100 overflow-hidden mb-8 group transition-all duration-500 hover:shadow-[0_30px_70px_rgba(0,0,0,0.06)]">
                    {/* Cover Area */}
                    <div className={cn(
                        "h-48 relative overflow-hidden transition-all duration-700",
                        profile.role === 'teacher' ? "bg-gradient-to-br from-[#7b9e89] via-[#a2c1b1] to-[#6ba88f]" :
                            profile.role === 'student' ? "bg-gradient-to-br from-[#b388c6] via-[#d4a5db] to-[#9a6cb4]" :
                                profile.role === 'parent' ? "bg-gradient-to-br from-[#e89b7b] via-[#f7c5ae] to-[#d47d55]" :
                                    "bg-gradient-to-br from-stone-400 to-stone-600"
                    )}>
                        {/* Decorative elements */}
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full blur-2xl -ml-10 -mb-10"></div>

                        {/* Avatar - Floating partially over cover */}
                        <div className="absolute -bottom-16 left-10 z-10">
                            <div className="relative group/avatar">
                                <div className="absolute inset-0 bg-white rounded-[35%] blur-xl opacity-40 group-hover/avatar:opacity-60 transition-opacity"></div>
                                <Avatar className="h-32 w-32 border-[6px] border-white shadow-2xl rounded-[32px] bg-white transition-transform duration-500 group-hover/avatar:scale-105">
                                    <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
                                    <AvatarFallback className="text-4xl font-black text-stone-200 bg-stone-50">{profile.full_name[0]?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                {profile.is_verified_expert && (
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
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h1 className="text-4xl font-black text-stone-800 tracking-tight">{profile.full_name}</h1>
                                        {profile.is_verified_expert && (
                                            <span className="bg-[#eaf2ed] text-[#557b66] text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider border border-[#7b9e89]/20">
                                                Doğrulanmış
                                            </span>
                                        )}
                                    </div>
                                    {profile.username && (
                                        <p className="text-[#7b9e89] font-bold text-lg">@{profile.username}</p>
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

                                    {profile.custom_id && (
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 border border-stone-100 rounded-2xl text-stone-400 font-mono text-xs font-bold">
                                            <span className="opacity-50 text-base">#</span>
                                            {profile.custom_id}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 text-stone-400 font-bold text-xs uppercase tracking-widest bg-stone-50/50 px-3 py-1.5 rounded-2xl border border-stone-100/50">
                                        <Clock className="h-3.5 w-3.5 text-[#7b9e89]" />
                                        {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true, locale: tr })} katıldı
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3">
                                {connectionStatus !== 'self' && (
                                    <>
                                        {connectionStatus === 'accepted' ? (
                                            <Button onClick={handleMessage}
                                                className="bg-stone-900 hover:bg-stone-800 text-white rounded-[20px] px-8 h-12 font-bold shadow-xl shadow-stone-200 transition-all hover:-translate-y-1">
                                                <MessageCircle className="h-5 w-5 mr-2" /> Mesaj Gönder
                                            </Button>
                                        ) : connectionStatus === 'none' ? (
                                            <Button onClick={handleConnect} disabled={actionLoading}
                                                className="bg-[#7b9e89] hover:bg-[#6ba88f] text-white rounded-[20px] px-8 h-12 font-bold shadow-xl shadow-[#7b9e89]/20 transition-all hover:-translate-y-1">
                                                {actionLoading ? "..." : "Bağlantı Kur"}
                                            </Button>
                                        ) : connectionStatus === 'pending_sent' ? (
                                            <div className="flex items-center gap-3 px-6 py-3 bg-stone-50 border border-stone-100 rounded-[20px] text-stone-500 font-bold text-sm">
                                                <Clock className="h-4 w-4 animate-pulse text-[#e89b7b]" /> İstek Beklemede
                                            </div>
                                        ) : (
                                            <Button onClick={handleAccept} disabled={actionLoading}
                                                className="bg-[#7b9e89] hover:bg-[#6ba88f] text-white rounded-[20px] px-8 h-12 font-bold shadow-xl shadow-[#7b9e89]/20 transition-all hover:-translate-y-1">
                                                İsteği Kabul Et
                                            </Button>
                                        )}
                                    </>
                                )}
                                {connectionStatus === 'self' && (
                                    <Link href="/profile">
                                        <Button variant="outline" className="rounded-[20px] px-8 h-12 font-bold border-stone-200 hover:bg-stone-50 transition-all hover:-translate-y-1">
                                            Profil Düzenle
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs: Hakkında / Portföyosu */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('hakkinda')}
                        className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all ${activeTab === 'hakkinda'
                            ? 'bg-white shadow-sm text-teal-600 border border-slate-200'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Hakkında
                    </button>
                    <button
                        onClick={() => setActiveTab('portfolyo')}
                        className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'portfolyo'
                            ? 'bg-white shadow-sm text-teal-600 border border-slate-200'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <BookOpen className="h-3.5 w-3.5" /> Portföyosu
                    </button>
                </div>

                {/* Hakkında Tab */}
                {activeTab === 'hakkinda' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-6">
                            {(profile.bio || profile.special_note) ? (
                                <>
                                    {profile.bio && (
                                        <div className="bg-white rounded-[32px] p-8 border border-stone-100 shadow-sm transition-all hover:shadow-md">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="w-1.5 h-6 bg-[#7b9e89] rounded-full" />
                                                <h2 className="font-black text-sm uppercase tracking-[0.2em] text-stone-400">Hakkında</h2>
                                            </div>
                                            <p className="text-stone-700 leading-[1.8] text-lg font-medium whitespace-pre-wrap">{profile.bio}</p>
                                        </div>
                                    )}

                                    {profile.special_note && (
                                        <div className="bg-[#fcece6]/30 rounded-[32px] p-8 border border-[#e89b7b]/10 shadow-sm transition-all hover:shadow-md">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="w-1.5 h-6 bg-[#e89b7b] rounded-full" />
                                                <h2 className="font-black text-sm uppercase tracking-[0.2em] text-[#c27658]">
                                                    {profile.role === 'teacher' ? 'Uzmanlık Alanı' : 'Özel Notlar'}
                                                </h2>
                                            </div>
                                            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-white/40">
                                                <p className="text-stone-700 leading-relaxed font-bold italic">{profile.special_note}</p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-20 bg-stone-50 rounded-[40px] border border-dashed border-stone-200">
                                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                        <ShieldCheck className="h-8 w-8 text-stone-200" />
                                    </div>
                                    <p className="text-stone-400 font-bold">Bu kullanıcı henüz bio eklememiş.</p>
                                </div>
                            )}
                        </div>

                        {/* Sidebar info */}
                        <div className="space-y-6">
                            {/* Social Links */}
                            {profile.social_links && Object.values(profile.social_links).some(v => v) && (
                                <div className="bg-white rounded-[32px] p-8 border border-stone-100 shadow-sm">
                                    <h2 className="font-black text-xs uppercase tracking-widest text-stone-400 mb-6">Sosyal Medya</h2>
                                    <div className="flex flex-col gap-3">
                                        {profile.social_links.instagram && (
                                            <a href={profile.social_links.instagram.startsWith('http') ? profile.social_links.instagram : `https://instagram.com/${profile.social_links.instagram}`}
                                                target="_blank" rel="noopener noreferrer"
                                                className="flex items-center justify-between p-4 bg-[#f4eefa] text-[#8a5ea5] rounded-2xl font-bold transition-all hover:-translate-x-1">
                                                <div className="flex items-center gap-3">
                                                    <Instagram className="h-5 w-5" />
                                                    <span>Instagram</span>
                                                </div>
                                                <ExternalLink className="h-4 w-4 opacity-30" />
                                            </a>
                                        )}
                                        {profile.social_links.twitter && (
                                            <a href={profile.social_links.twitter.startsWith('http') ? profile.social_links.twitter : `https://twitter.com/${profile.social_links.twitter}`}
                                                target="_blank" rel="noopener noreferrer"
                                                className="flex items-center justify-between p-4 bg-stone-900 text-white rounded-2xl font-bold transition-all hover:-translate-x-1">
                                                <div className="flex items-center gap-3">
                                                    <Twitter className="h-5 w-5" />
                                                    <span>X.com</span>
                                                </div>
                                                <ExternalLink className="h-4 w-4 opacity-30" />
                                            </a>
                                        )}
                                        {profile.social_links.spotify && (
                                            <a href={profile.social_links.spotify} target="_blank" rel="noopener noreferrer"
                                                className="flex items-center justify-between p-4 bg-[#1DB954]/10 text-[#1DB954] rounded-2xl font-bold transition-all hover:-translate-x-1">
                                                <div className="flex items-center gap-3">
                                                    <Music className="h-5 w-5" />
                                                    <span>Spotify</span>
                                                </div>
                                                <ExternalLink className="h-4 w-4 opacity-30" />
                                            </a>
                                        )}
                                        {profile.social_links.website && (
                                            <a href={profile.social_links.website} target="_blank" rel="noopener noreferrer"
                                                className="flex items-center justify-between p-4 bg-[#eaf2ed] text-[#557b66] rounded-2xl font-bold transition-all hover:-translate-x-1">
                                                <div className="flex items-center gap-3">
                                                    <Globe className="h-5 w-5" />
                                                    <span>Web Sitesi</span>
                                                </div>
                                                <ExternalLink className="h-4 w-4 opacity-30" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Trust Card */}
                            <div className="bg-gradient-to-br from-[#7b9e89] to-[#6ba88f] rounded-[32px] p-8 text-white shadow-xl shadow-[#7b9e89]/20 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                                <ShieldCheck className="h-10 w-10 mb-4 opacity-80" />
                                <h3 className="text-xl font-black mb-2">Güvenli İletişim</h3>
                                <p className="text-white/80 text-sm font-bold leading-relaxed">
                                    Ruhefza üzerinden kurulan tüm bağlantılar ve mesajlaşmalar uçtan uca korunmaktadır.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Portföyosu Tab */}
                {activeTab === 'portfolyo' && (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                        <PortfolioTab userId={profileId} isOwner={false} role={profile.role} />
                    </div>
                )}
            </div>
        </AppShell>
    );
}
