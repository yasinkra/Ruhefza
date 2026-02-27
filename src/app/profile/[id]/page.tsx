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
                <Link href="/" className="text-sky-600 underline">Ana sayfaya dön</Link>
            </div>
        </AppShell>
    );

    return (
        <AppShell>
            <div className="max-w-2xl mx-auto px-4 py-8 pb-20">
                {/* Back */}
                <button onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors text-sm font-medium">
                    <ArrowLeft className="h-4 w-4" /> Geri
                </button>

                {/* Profile Header */}
                <div className="glass-effect rounded-2xl shadow-xl border border-white/50 overflow-hidden mb-6 transition-transform duration-300 hover:shadow-2xl">
                    {/* Cover Area */}
                    <div className={`h-40 bg-gradient-to-r ${profile.role === 'student' ? 'from-orange-500 via-amber-500 to-yellow-400' : profile.role === 'teacher' ? 'from-sky-500 via-blue-600 to-indigo-600' : profile.role === 'parent' ? 'from-emerald-500 via-teal-500 to-cyan-500' : 'from-violet-600 via-indigo-600 to-sky-500'} relative`}>
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                        <div className="absolute -bottom-14 left-8">
                            <Avatar className="h-28 w-28 border-4 border-white shadow-xl bg-white ring-2 ring-slate-100">
                                <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
                                <AvatarFallback className="text-3xl font-black text-slate-300 bg-slate-50">{profile.full_name[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                        </div>
                    </div>

                    {/* Info Area (starts below cover) */}
                    <div className="pt-16 pb-6 px-8 relative bg-white">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-2xl font-black text-slate-900">{profile.full_name}</h1>
                                    {profile.is_verified_expert && (
                                        <ShieldCheck className="h-5 w-5 text-sky-500" aria-label="Doğrulanmış Uzman" />
                                    )}
                                </div>
                                {profile.username && (
                                    <p className="text-sky-600 font-semibold text-sm mt-0.5">@{profile.username}</p>
                                )}
                                <div className="flex items-center gap-3 mt-3 flex-wrap">
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${profile.role === 'student' ? 'bg-orange-100 text-orange-700' : profile.role === 'teacher' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {profile.role === 'teacher' ? '👩‍🏫 Öğretmen' : profile.role === 'student' ? '🎓 Öğrenci' : '👨‍👩‍👧 Ebeveyn'}
                                    </span>
                                    {profile.custom_id && (
                                        <span className="text-xs text-slate-400 font-mono font-medium bg-slate-50 px-2 py-0.5 rounded-md">#{profile.custom_id}</span>
                                    )}
                                    <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                                        <Clock className="h-3 w-3" />
                                        {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true, locale: tr })} katıldı
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    {connectionStatus !== 'self' && (
                        <div className="flex gap-3 mt-6 pt-5 border-t border-slate-100">
                            {connectionStatus === 'accepted' && (
                                <Button onClick={handleMessage}
                                    className="flex-1 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold">
                                    <MessageCircle className="h-4 w-4 mr-2" /> Mesaj Gönder
                                </Button>
                            )}
                            {connectionStatus === 'none' && (
                                <Button onClick={handleConnect} disabled={actionLoading}
                                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold">
                                    {actionLoading ? "..." : "Bağlantı İsteği Gönder"}
                                </Button>
                            )}
                            {connectionStatus === 'pending_sent' && (
                                <div className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 py-2.5 text-sm font-bold">
                                    <Clock className="h-4 w-4" /> İstek Gönderildi
                                </div>
                            )}
                            {connectionStatus === 'pending_received' && (
                                <Button onClick={handleAccept} disabled={actionLoading}
                                    className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold">
                                    {actionLoading ? "..." : "İsteği Kabul Et"}
                                </Button>
                            )}
                        </div>
                    )}
                    {connectionStatus === 'self' && (
                        <div className="mt-5 pt-5 border-t border-slate-100">
                            <Link href="/profile">
                                <Button variant="outline" className="w-full rounded-xl font-bold">
                                    Profilini Düzenle
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>

                {/* Tabs: Hakkında / Portföyosu */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('hakkinda')}
                        className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all ${activeTab === 'hakkinda'
                            ? 'bg-white shadow-sm text-sky-600 border border-slate-200'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Hakkında
                    </button>
                    <button
                        onClick={() => setActiveTab('portfolyo')}
                        className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'portfolyo'
                            ? 'bg-white shadow-sm text-sky-600 border border-slate-200'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <BookOpen className="h-3.5 w-3.5" /> Portföyosu
                    </button>
                </div>

                {/* Hakkında Tab */}
                {activeTab === 'hakkinda' && (
                    <div className="space-y-4">
                        {profile.bio && (
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                                <h2 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-3">Hakkında</h2>
                                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
                            </div>
                        )}

                        {profile.special_note && (
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                                <h2 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-3">
                                    {profile.role === 'teacher' ? 'Uzmanlık Alanı' : 'Notlar'}
                                </h2>
                                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{profile.special_note}</p>
                            </div>
                        )}

                        {(!profile.bio && !profile.special_note) && (
                            <div className="text-center py-12 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
                                <p className="text-sm font-medium">Bu kullanıcı henüz bio eklememiş.</p>
                            </div>
                        )}

                        {profile.social_links && Object.values(profile.social_links).some(v => v) && (
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                                <h2 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-4">Sosyal Medya</h2>
                                <div className="flex flex-wrap gap-3">
                                    {profile.social_links.instagram && (
                                        <a href={profile.social_links.instagram.startsWith('http') ? profile.social_links.instagram : `https://instagram.com/${profile.social_links.instagram}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-pink-500 to-rose-500 text-white rounded-xl text-sm font-bold shadow-sm hover:-translate-y-0.5 transition-transform">
                                            <Instagram className="h-4 w-4" /> Instagram
                                        </a>
                                    )}
                                    {profile.social_links.twitter && (
                                        <a href={profile.social_links.twitter.startsWith('http') ? profile.social_links.twitter : `https://twitter.com/${profile.social_links.twitter}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-sm hover:-translate-y-0.5 transition-transform">
                                            <Twitter className="h-4 w-4" /> X.com
                                        </a>
                                    )}
                                    {profile.social_links.spotify && (
                                        <a href={profile.social_links.spotify} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-4 py-2 bg-[#1DB954] text-white rounded-xl text-sm font-bold shadow-sm hover:-translate-y-0.5 transition-transform">
                                            <Music className="h-4 w-4" /> Spotify
                                        </a>
                                    )}
                                    {profile.social_links.website && (
                                        <a href={profile.social_links.website} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-800 rounded-xl text-sm font-bold shadow-sm hover:-translate-y-0.5 transition-transform">
                                            <Globe className="h-4 w-4 text-sky-500" /> Portfolyo <ExternalLink className="h-3 w-3 opacity-50" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
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
