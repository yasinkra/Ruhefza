"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
    ShieldCheck,
    Users,
    UserCheck,
    BookOpen,
    MessageSquare,
    Megaphone,
    Search as SearchIcon,
    Loader2,
    CheckCircle2,
    FileText,
    UserX,
    Ban,
    Clock
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PendingTeacher {
    id: string;
    full_name: string;
    created_at: string;
    verification_document_url: string | null;
}

interface AdminStats {
    total_users: number;
    active_users: number;
    banned_users: number;
    total_articles: number;
    total_posts: number;
    category_stats: Record<string, number>;
}

interface UserProfile {
    id: string;
    full_name: string;
    username: string | null;
    custom_id: number;
    role: string;
    is_admin: boolean;
    is_banned: boolean;
    created_at: string;
    avatar_url: string | null;
}

export default function AdminDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [pendingTeachers, setPendingTeachers] = useState<PendingTeacher[]>([]);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [announcement, setAnnouncement] = useState({ message: "", active: false });
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [loadingStats, setLoadingStats] = useState(true);

    const fetchPendingTeachers = async () => {
        const { data } = await createClient()
            .from("profiles")
            .select("id, full_name, created_at, verification_document_url")
            .eq("role", "teacher")
            .eq("verification_status", "pending")
            .order("created_at", { ascending: false });
        setPendingTeachers(data || []);
    };

    const fetchStats = async () => {
        setLoadingStats(true);
        const { data } = await createClient().rpc('get_admin_stats');
        if (data) setStats(data);
        setLoadingStats(false);
    };

    const fetchAnnouncement = async () => {
        const { data } = await createClient()
            .from("system_settings")
            .select("announcement_message, is_announcement_active")
            .eq("id", 'global')
            .single();
        if (data) {
            setAnnouncement({
                message: data.announcement_message,
                active: data.is_announcement_active
            });
        }
    };

    const fetchRandomUsers = async () => {
        const { data } = await createClient()
            .from("profiles")
            .select("id, full_name, username, custom_id, role, is_admin, is_banned, created_at, avatar_url")
            .limit(5);
        setSearchResults((data as UserProfile[]) || []);
    };

    useEffect(() => {
        const checkAdminAndFetchData = async () => {
            const { data: { user } } = await createClient().auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }

            const { data: profile } = await createClient()
                .from("profiles")
                .select("is_admin")
                .eq("id", user.id)
                .single();

            if (!profile?.is_admin) {
                toast.error("Bu sayfayı görüntüleme yetkiniz yok.");
                router.push("/");
                return;
            }

            setIsAdmin(true);
            fetchPendingTeachers();
            fetchStats();
            fetchAnnouncement();
            fetchRandomUsers();
            setLoading(false);
        };

        checkAdminAndFetchData();
    }, [router]);

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 3) return;

        setLoadingSearch(true);
        const { data } = await createClient().rpc('search_user_admin', { search_query: query });
        if (data) setSearchResults(data);
        setLoadingSearch(false);
    };

    const handleUpdateAnnouncement = async () => {
        try {
            const { error } = await createClient().rpc('update_announcement', {
                message: announcement.message,
                active: announcement.active
            });
            if (error) throw error;
            toast.success("Duyuru güncellendi.");
        } catch (err) {
            toast.error("Duyuru güncellenemedi.");
        }
    };

    const handleToggleBan = async (userId: string) => {
        try {
            const { error } = await createClient().rpc('toggle_user_ban', { target_user_id: userId });
            if (error) throw error;

            setSearchResults(prev => prev.map(u =>
                u.id === userId ? { ...u, is_banned: !u.is_banned } : u
            ));

            toast.success("Kullanıcı durumu güncellendi.");
            fetchStats(); // Update stats
        } catch (err) {
            toast.error("İşlem başarısız.");
        }
    };

    const handleViewDocument = async (path: string | null) => {
        if (!path) {
            toast.error("Belge bulunamadı.");
            return;
        }

        try {
            // Create a short-lived signed URL to view the private document
            const { data, error } = await createClient().storage
                .from("verification_documents")
                .createSignedUrl(path, 60); // 60 seconds validity

            if (error) throw error;

            if (data?.signedUrl) {
                window.open(data.signedUrl, "_blank");
            }
        } catch (error) {
            console.error("Error getting document URL:", error);
            toast.error("Belge açılırken bir hata oluştu.");
        }
    };

    const handleAction = async (teacherId: string, isApproved: boolean) => {
        if (!confirm(`Bu kullanıcının uzmanlığını ${isApproved ? 'ONAYLAMAK' : 'REDDETMEK'} istediğinize emin misiniz?`)) return;

        setProcessingId(teacherId);

        try {
            const { error } = await createClient().rpc('approve_teacher_verification', {
                teacher_id: teacherId,
                is_approved: isApproved
            });

            if (error) throw error;

            toast.success(isApproved ? "Uzman onaylandı!" : "Başvuru reddedildi.");

            // Remove from list
            setPendingTeachers(prev => prev.filter(t => t.id !== teacherId));

        } catch (error) {
            console.error("Action error:", error);
            toast.error("İşlem sırasında bir hata oluştu: " + (error as Error).message);
        } finally {
            setProcessingId(null);
        }
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

    if (!isAdmin) return null;

    return (
        <AppShell>
            <div className="max-w-6xl mx-auto py-8 px-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-br from-stone-900 to-stone-800 p-3.5 rounded-2xl shadow-xl shadow-slate-200 ring-1 ring-white/10">
                            <ShieldCheck className="h-7 w-7 text-teal-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Yönetici Paneli</h1>
                            <p className="text-stone-500 font-medium flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Sistem durumu ve kullanıcı yönetimi
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1.5 rounded-xl border border-stone-200/60 shadow-sm">
                        <div className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 text-xs font-bold uppercase tracking-wider border border-teal-100">
                            Admin Modu
                        </div>
                    </div>
                </div>

                <Tabs defaultValue="stats" className="space-y-8">
                    <TabsList className="bg-stone-200/50 backdrop-blur-md p-1.5 rounded-2xl h-auto flex-wrap justify-start gap-1.5 border border-stone-200/50 shadow-inner">
                        <TabsTrigger value="stats" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-teal-600 transition-all font-semibold">
                            İstatistikler
                        </TabsTrigger>
                        <TabsTrigger value="announcement" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-teal-600 transition-all font-semibold">
                            Duyuru
                        </TabsTrigger>
                        <TabsTrigger value="approvals" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-teal-600 transition-all font-semibold flex items-center gap-2">
                            Onaylar {pendingTeachers.length > 0 && (
                                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-lg shadow-red-200 animate-bounce">
                                    {pendingTeachers.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="users" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-teal-600 transition-all font-semibold">
                            Kullanıcılar
                        </TabsTrigger>
                    </TabsList>

                    {/* Stats Tab */}
                    <TabsContent value="stats" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {loadingStats ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
                                {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-stone-100 rounded-3xl" />)}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <Card className="border-none shadow-lg shadow-teal-500/5 bg-gradient-to-br from-white to-teal-50/30 overflow-hidden group hover:-translate-y-1 transition-all duration-300 rounded-3xl">
                                    <CardContent className="p-7">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="bg-teal-100 p-3 rounded-2xl text-teal-600 group-hover:bg-teal-500 group-hover:text-white transition-all duration-300 shadow-sm">
                                                <Users className="h-6 w-6" />
                                            </div>
                                            <span className="text-[11px] font-black text-teal-600 bg-teal-100/50 px-2.5 py-1 rounded-lg uppercase tracking-wider">Toplam</span>
                                        </div>
                                        <div className="text-3xl font-black text-stone-900 tabular-nums">{stats?.total_users || 0}</div>
                                        <div className="text-sm text-stone-500 font-semibold mt-1">Kayıtlı Kullanıcı</div>
                                    </CardContent>
                                </Card>
                                <Card className="border-none shadow-lg shadow-emerald-500/5 bg-gradient-to-br from-white to-emerald-50/30 overflow-hidden group hover:-translate-y-1 transition-all duration-300 rounded-3xl">
                                    <CardContent className="p-7">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 shadow-sm">
                                                <UserCheck className="h-6 w-6" />
                                            </div>
                                            <span className="text-[11px] font-black text-emerald-600 bg-emerald-100/50 px-2.5 py-1 rounded-lg uppercase tracking-wider">Aktif</span>
                                        </div>
                                        <div className="text-3xl font-black text-stone-900 tabular-nums">{stats?.active_users || 0}</div>
                                        <div className="text-sm text-stone-500 font-semibold mt-1">Aktif Hesaplar</div>
                                    </CardContent>
                                </Card>
                                <Card className="border-none shadow-lg shadow-amber-500/5 bg-gradient-to-br from-white to-amber-50/30 overflow-hidden group hover:-translate-y-1 transition-all duration-300 rounded-3xl">
                                    <CardContent className="p-7">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="bg-amber-100 p-3 rounded-2xl text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shadow-sm">
                                                <BookOpen className="h-6 w-6" />
                                            </div>
                                            <span className="text-[11px] font-black text-amber-600 bg-amber-100/50 px-2.5 py-1 rounded-lg uppercase tracking-wider">Kütüphane</span>
                                        </div>
                                        <div className="text-3xl font-black text-stone-900 tabular-nums">{stats?.total_articles || 0}</div>
                                        <div className="text-sm text-stone-500 font-semibold mt-1">Yazılan Makale</div>
                                    </CardContent>
                                </Card>
                                <Card className="border-none shadow-lg shadow-indigo-500/5 bg-gradient-to-br from-white to-indigo-50/30 overflow-hidden group hover:-translate-y-1 transition-all duration-300 rounded-3xl">
                                    <CardContent className="p-7">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300 shadow-sm">
                                                <MessageSquare className="h-6 w-6" />
                                            </div>
                                            <span className="text-[11px] font-black text-indigo-600 bg-indigo-100/50 px-2.5 py-1 rounded-lg uppercase tracking-wider">Etkileşim</span>
                                        </div>
                                        <div className="text-3xl font-black text-stone-900 tabular-nums">{stats?.total_posts || 0}</div>
                                        <div className="text-sm text-stone-500 font-semibold mt-1">Toplam Post</div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </TabsContent>

                    {/* Announcement Tab */}
                    <TabsContent value="announcement" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Card className="border-none shadow-xl bg-white overflow-hidden rounded-3xl ring-1 ring-stone-100">
                            <CardHeader className="pb-6 bg-stone-50/50">
                                <CardTitle className="text-xl flex items-center gap-3 text-stone-900">
                                    <div className="p-2 bg-teal-500 rounded-xl">
                                        <Megaphone className="h-5 w-5 text-white" />
                                    </div>
                                    Global Sistem Duyurusu
                                </CardTitle>
                                <CardDescription className="font-medium">
                                    Buraya yazılan mesaj tüm kullanıcıların akış sayfasında en üstte görünecektir.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-8">
                                <div className="space-y-3">
                                    <Label className="text-sm font-bold text-stone-700 ml-1">Duyuru Metni</Label>
                                    <Input
                                        placeholder="Örn: Yeni güncelleme yayınlandı!"
                                        value={announcement.message}
                                        onChange={(e) => setAnnouncement(prev => ({ ...prev, message: e.target.value }))}
                                        className="h-14 bg-stone-50 border-stone-200 focus:bg-white transition-all text-base rounded-2xl px-5"
                                    />
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                                    <div className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            id="active-toggle"
                                            checked={announcement.active}
                                            onChange={(e) => setAnnouncement(prev => ({ ...prev, active: e.target.checked }))}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                                    </div>
                                    <Label htmlFor="active-toggle" className="cursor-pointer font-bold text-stone-700">Duyuruyu Aktif Et</Label>
                                </div>
                                <Button
                                    onClick={handleUpdateAnnouncement}
                                    className="h-12 px-8 bg-stone-900 text-white rounded-2xl hover:bg-stone-800 transition-all font-bold shadow-lg shadow-slate-200"
                                >
                                    Güncelle ve Yayınla
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Approvals Tab */}
                    <TabsContent value="approvals" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {pendingTeachers.length === 0 ? (
                            <div className="text-center py-24 bg-white rounded-[32px] border border-stone-100 shadow-xl overflow-hidden relative group">
                                <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-400 to-teal-400"></div>
                                <div className="bg-emerald-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500">
                                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                                </div>
                                <h3 className="text-xl font-bold text-stone-900">Bekleyen onay işlemi yok</h3>
                                <p className="text-stone-500 mt-2 font-medium max-w-sm mx-auto px-4">Tüm öğretmen başvuruları değerlendirilmiş. Yeni başvurular geldiğinde burada listelenecektir.</p>
                            </div>
                        ) : (
                            <div className="grid gap-6">
                                {pendingTeachers.map((teacher) => (
                                    <Card key={teacher.id} className="overflow-hidden shadow-xl border-none bg-white hover:shadow-2xl transition-all duration-300 rounded-[28px] group ring-1 ring-stone-100">
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-6 sm:p-8 gap-6">
                                            <div className="flex items-center gap-5">
                                                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-teal-50 to-indigo-50 flex items-center justify-center text-teal-600 font-black text-xl shadow-inner border border-white">
                                                    {teacher.full_name?.[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-stone-900 tracking-tight">{teacher.full_name}</h3>
                                                    <div className="flex items-center gap-3 mt-1.5">
                                                        <span className="bg-stone-900 text-white text-[10px] tabular-nums font-bold px-2 py-0.5 rounded-md shadow-sm">#{teacher.id.substring(0, 8)}</span>
                                                        <div className="flex items-center gap-1.5 text-xs text-stone-500 font-semibold">
                                                            <Clock className="h-3.5 w-3.5" />
                                                            {format(new Date(teacher.created_at), "d MMMM yyyy", { locale: tr })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleViewDocument(teacher.verification_document_url)}
                                                    disabled={!teacher.verification_document_url || processingId === teacher.id}
                                                    className="h-12 border-stone-200 text-stone-700 hover:bg-stone-50 flex-1 sm:flex-none font-bold rounded-2xl transition-all px-6"
                                                >
                                                    <FileText className="h-5 w-5 mr-2 text-teal-500" />
                                                    Belgeyi İncele
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleAction(teacher.id, false)}
                                                    disabled={processingId === teacher.id}
                                                    className="h-12 w-12 rounded-2xl border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center p-0"
                                                >
                                                    {processingId === teacher.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserX className="h-5 w-5" />}
                                                </Button>
                                                <Button
                                                    onClick={() => handleAction(teacher.id, true)}
                                                    disabled={processingId === teacher.id}
                                                    className="h-12 px-8 bg-black text-white rounded-2xl hover:bg-stone-800 transition-all font-bold shadow-lg shadow-slate-200 flex-1 sm:flex-none ring-offset-2 focus:ring-2 ring-stone-900"
                                                >
                                                    {processingId === teacher.id ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ShieldCheck className="h-5 w-5 mr-2 text-emerald-400" />}
                                                    Onayla
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Users Tab */}
                    <TabsContent value="users" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-6">
                            <div className="relative group">
                                <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 group-focus-within:text-teal-500 transition-colors" />
                                <Input
                                    placeholder="Kullanıcı ara (ID veya İsim)..."
                                    className="pl-14 h-14 bg-white border-stone-200 focus:border-teal-300 focus:ring-0 text-base rounded-[20px] transition-all shadow-sm"
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                />
                                {loadingSearch && (
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2">
                                        <Loader2 className="h-5 w-5 animate-spin text-teal-500" />
                                    </div>
                                )}
                            </div>

                            <div className="grid gap-4">
                                {searchResults.map((u) => (
                                    <Card key={u.id} className={cn(
                                        "overflow-hidden shadow-md border-none bg-white transition-all duration-300 rounded-2xl group",
                                        u.is_banned ? "opacity-75 grayscale-[0.3] border-l-4 border-l-red-500" : "hover:shadow-xl ring-1 ring-stone-100"
                                    )}>
                                        <div className="flex items-center justify-between p-5 flex-wrap gap-4">
                                            <div className="flex items-center gap-4">
                                                <Avatar className="h-12 w-12 border border-stone-100">
                                                    <AvatarImage src={u.avatar_url || undefined} className="object-cover" />
                                                    <AvatarFallback className={cn(
                                                        "font-black text-base uppercase",
                                                        u.is_banned ? "bg-red-50 text-red-600" : (u.is_admin ? "bg-stone-900 text-white" : "bg-teal-50 text-teal-600")
                                                    )}>
                                                        {u.full_name?.[0]?.toUpperCase() || "U"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-bold text-stone-900 flex items-center gap-2">
                                                        {u.full_name}
                                                        {u.is_admin && <span className="text-[10px] bg-stone-900 text-teal-400 px-2 py-0.5 rounded font-black uppercase tracking-widest">Admin</span>}
                                                    </div>
                                                    <div className="text-[11px] text-stone-500 flex items-center gap-x-3 gap-y-0.5 uppercase font-black tracking-tight mt-0.5 flex-wrap">
                                                        <span className={cn(u.role === 'teacher' ? 'text-indigo-600' : 'text-stone-500')}>{u.role || 'BELİRTİLMEMİŞ'}</span>
                                                        <span className="text-teal-600">@{u.username || "isimsiz"}</span>
                                                        <span className="text-stone-400">#{u.custom_id || "---"}</span>
                                                        <span className="font-mono text-[9px] lowercase opacity-50">{u.id.substring(0, 8)}...</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 ml-auto">
                                                <span className={cn(
                                                    "text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider",
                                                    u.is_banned ? "bg-red-50 text-red-600 border border-red-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                                )}>
                                                    {u.is_banned ? "Pasif / Banlı" : "Aktif"}
                                                </span>
                                                {!u.is_admin && (
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => handleToggleBan(u.id)}
                                                        className={cn(
                                                            "h-10 px-5 text-xs font-black rounded-xl transition-all",
                                                            u.is_banned ? "border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100" : "border-red-200 text-red-600 bg-red-50 hover:bg-red-100"
                                                        )}
                                                    >
                                                        {u.is_banned ? <UserCheck className="h-4 w-4 mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
                                                        {u.is_banned ? "BANI KALDIR" : "KULLANICIYI BANLA"}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                ))}

                                {searchResults.length === 0 && !loadingSearch && searchQuery && (
                                    <div className="text-center py-12 bg-stone-50/50 rounded-[32px] border border-dashed border-stone-200">
                                        <Users className="h-10 w-10 text-stone-300 mx-auto mb-3" />
                                        <p className="text-stone-500 font-bold">&quot;{searchQuery}&quot; için sonuç bulunamadı.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </AppShell>
    );
}
