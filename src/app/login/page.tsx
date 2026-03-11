"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Lock, Eye, EyeOff, Star } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const signOut = async () => {
            await createClient().auth.signOut();
        };
        signOut();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await createClient().auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            router.push("/feed");
            router.refresh();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Panel — Brand Info */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#0c9789] via-[#0a7c70] to-[#065f56] text-white">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
                    <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
                    <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-white/15 blur-2xl" />
                </div>

                <div className="relative z-10 flex flex-col items-center justify-between p-12 w-full">
                    {/* Top — Logo (centered, vertical) */}
                    <div className="flex flex-col items-center gap-2 pt-4">
                        <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-lg shadow-black/20 bg-white/10 backdrop-blur-sm p-1">
                            <Image src="/logo.png" alt="Ruhefza Logo" fill className="object-cover rounded-xl" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">Ruhefza</span>
                        <span className="text-sm text-white/70 italic">&quot;Özel eğitimde beraber daha güçlüyüz&quot;</span>
                    </div>

                    {/* Center — Community Feed Preview Card */}
                    <div className="w-full max-w-sm">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">Topluluk Akışı</h3>
                                    <p className="text-xs text-white/60">Yeni etkinlikler ve paylaşımlar</p>
                                </div>
                            </div>
                            {/* Feed preview mockup */}
                            <div className="space-y-3">
                                <div className="bg-white/5 rounded-xl p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 rounded-full bg-white/20" />
                                        <div className="h-2.5 w-20 bg-white/15 rounded-full" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="h-2 w-full bg-white/10 rounded-full" />
                                        <div className="h-2 w-3/4 bg-white/10 rounded-full" />
                                    </div>
                                </div>
                                <div className="bg-white/5 rounded-xl p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 rounded-full bg-white/20" />
                                        <div className="h-2.5 w-24 bg-white/15 rounded-full" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="h-2 w-full bg-white/10 rounded-full" />
                                        <div className="h-2 w-1/2 bg-white/10 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom — Avatars + Stars + Social Proof */}
                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3">
                        <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full bg-white/30 border-2 border-white/40" />
                            <div className="w-8 h-8 rounded-full bg-white/25 border-2 border-white/40" />
                            <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/40" />
                            <div className="w-8 h-8 rounded-full bg-white/15 border-2 border-white/40" />
                        </div>
                        <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                            ))}
                        </div>
                        <span className="text-sm font-medium text-white/90">1000+ aile topluluğumuza katıldı</span>
                    </div>
                </div>
            </div>

            {/* Right Panel — Login Form */}
            <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
                <div className="w-full max-w-md space-y-8">
                    {/* Form Header */}
                    <div className="space-y-2">
                        <h2 className="text-3xl font-bold text-gray-900">Tekrar Hoş Geldiniz</h2>
                        <p className="text-gray-500">Hesabınıza giriş yapın</p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">E-posta Adresi</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    placeholder="örnek@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full h-12 pl-11 pr-4 rounded-lg border border-gray-200 bg-gray-50/50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0c9789] focus:ring-2 focus:ring-[#0c9789]/20 transition-all"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-700">Şifre</label>
                                <button type="button" className="text-xs text-[#0c9789] hover:text-[#0a7c70] font-medium">
                                    Şifremi Unuttum
                                </button>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full h-12 pl-11 pr-12 rounded-lg border border-gray-200 bg-gray-50/50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0c9789] focus:ring-2 focus:ring-[#0c9789]/20 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3 font-medium">{error}</div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-12 bg-[#0c9789] hover:bg-[#0a7c70] text-white rounded-full font-semibold text-base transition-all duration-200 shadow-lg shadow-[#0c9789]/25 hover:shadow-[#0c9789]/40"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Giriş yapılıyor...
                                </>
                            ) : (
                                "Giriş Yap"
                            )}
                        </Button>

                        {/* Divider */}
                        <div className="relative flex items-center gap-3">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-sm text-gray-400">veya</span>
                            <div className="flex-1 h-px bg-gray-200" />
                        </div>

                        {/* Google Login */}
                        <button
                            type="button"
                            className="w-full h-12 flex items-center justify-center gap-3 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium text-sm transition-all duration-200"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google ile Giriş Yap
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="text-center text-sm text-gray-500">
                        Hesabınız yok mu?{" "}
                        <Link href="/signup" className="text-[#0c9789] hover:text-[#0a7c70] font-semibold">
                            Kayıt Ol
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
