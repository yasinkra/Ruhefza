"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, User, Mail, Lock, Eye, EyeOff, Info, Check, Users, GraduationCap, BookOpen } from "lucide-react";
import { toast } from "sonner";

export default function SignupPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [role, setRole] = useState("parent");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);

    useEffect(() => {
        const signOut = async () => {
            await createClient().auth.signOut();
        };
        signOut();
    }, []);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!acceptTerms) {
                throw new Error("Kullanım koşullarını ve gizlilik politikasını kabul etmelisiniz.");
            }

            if (password !== confirmPassword) {
                throw new Error("Şifreler eşleşmiyor.");
            }

            if (password.length < 8) {
                throw new Error("Şifre en az 8 karakter olmalıdır.");
            }

            if (role === 'student' && !email.toLowerCase().endsWith('.edu.tr')) {
                throw new Error("Öğrenci hesabı oluşturmak için lütfen '.edu.tr' uzantılı üniversite e-posta adresinizi kullanın.");
            }

            const isStudent = role === 'student';
            const initialVerificationStatus = isStudent ? 'approved' : (role === 'teacher' ? 'unverified' : 'none');

            const { data, error: signUpError } = await createClient().auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        role: role
                    }
                }
            });

            if (signUpError) throw signUpError;

            if (data.user) {
                const { error: profileError } = await createClient()
                    .from('profiles')
                    .update({
                        full_name: fullName,
                        role: role,
                        verification_status: initialVerificationStatus,
                        is_verified_expert: isStudent
                    })
                    .eq('id', data.user.id);

                if (profileError) {
                    console.error("Profile update error:", profileError);
                }
            }

            toast.success("Kayıt başarılı! Lütfen e-postanızı doğrulayın.");
            router.push("/login");

        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const roles = [
        { value: 'parent', label: 'Ebeveyn', icon: Users, desc: 'Destek & öğrenme' },
        { value: 'teacher', label: 'Öğretmen', icon: GraduationCap, desc: 'Özel Eğitim' },
        { value: 'student', label: 'Öğrenci', icon: BookOpen, desc: '.edu.tr zorunlu' },
    ];

    return (
        <div className="min-h-screen flex">
            {/* Left Panel — Brand Info */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#0c9789] via-[#0a7c70] to-[#065f56] text-white">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-20 right-20 w-80 h-80 rounded-full bg-white/20 blur-3xl" />
                    <div className="absolute bottom-32 left-10 w-72 h-72 rounded-full bg-white/15 blur-3xl" />
                </div>

                <div className="relative z-10 flex flex-col justify-between p-12 w-full">
                    {/* Top — Logo */}
                    <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden">
                            <Image src="/logo.png" alt="Ruhefza Logo" fill className="object-cover" />
                        </div>
                        <span className="text-lg font-bold tracking-tight">Ruhefza</span>
                    </div>

                    {/* Center — Quote + Feature Card */}
                    <div className="space-y-8 max-w-md">
                        <blockquote className="text-3xl font-bold leading-tight italic">
                            &ldquo;Her çocuk özeldir, her aile değerlidir&rdquo;
                        </blockquote>
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">Uzman Destek Ağı</h3>
                                    <p className="text-xs text-white/70">Alanında uzman kişilerle bağlantı kurun.</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-2.5">
                                <span className="text-xs text-white/70">Haftalık yeni içerikler</span>
                                <span className="text-sm font-bold text-emerald-300">+12</span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom — Social Proof */}
                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 w-fit">
                        <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full bg-white/30 border-2 border-white/40" />
                            <div className="w-8 h-8 rounded-full bg-white/25 border-2 border-white/40" />
                            <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/40" />
                            <div className="w-8 h-8 rounded-full bg-white/15 border-2 border-white/40" />
                        </div>
                        <span className="text-sm font-medium text-white/90">1000+ aile aramıza katıldı</span>
                    </div>
                </div>
            </div>

            {/* Right Panel — Signup Form */}
            <div className="flex-1 flex items-center justify-center bg-white px-6 py-12 overflow-y-auto">
                <div className="w-full max-w-md space-y-6">
                    {/* Form Header */}
                    <div className="space-y-2">
                        <h2 className="text-3xl font-bold text-gray-900">Topluluğa Katılın</h2>
                        <p className="text-gray-500">Birkaç dakikada ücretsiz hesabınızı oluşturun.</p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-4">
                        {/* Role Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Rolünüzü Seçin</label>
                            <div className="grid grid-cols-3 gap-3">
                                {roles.map((r) => {
                                    const Icon = r.icon;
                                    const isSelected = role === r.value;
                                    return (
                                        <label
                                            key={r.value}
                                            className={`relative flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                                                isSelected
                                                    ? 'border-[#0c9789] bg-[#f0fdfa] shadow-sm shadow-[#0c9789]/10'
                                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="role"
                                                value={r.value}
                                                className="sr-only"
                                                checked={isSelected}
                                                onChange={() => setRole(r.value)}
                                            />
                                            {isSelected && (
                                                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#0c9789] rounded-full flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                            <Icon className={`w-6 h-6 mb-1.5 ${isSelected ? 'text-[#0c9789]' : 'text-gray-500'}`} />
                                            <span className={`font-semibold text-sm ${isSelected ? 'text-[#0c9789]' : 'text-gray-800'}`}>{r.label}</span>
                                            <span className="text-[10px] text-gray-500 text-center mt-0.5">{r.desc}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Full Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Ad Soyad</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Adınız ve Soyadınız"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    className="w-full h-12 pl-11 pr-4 rounded-lg border border-gray-200 bg-gray-50/50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0c9789] focus:ring-2 focus:ring-[#0c9789]/20 transition-all"
                                />
                            </div>
                        </div>

                        {/* Email */}
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

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Şifre</label>
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
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Info className="w-3 h-3" />
                                En az 8 karakter olmalıdır.
                            </p>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Şifre Tekrar</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="w-full h-12 pl-11 pr-12 rounded-lg border border-gray-200 bg-gray-50/50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0c9789] focus:ring-2 focus:ring-[#0c9789]/20 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Terms Checkbox */}
                        <div className="flex items-start gap-2">
                            <input
                                type="checkbox"
                                id="terms"
                                checked={acceptTerms}
                                onChange={(e) => setAcceptTerms(e.target.checked)}
                                className="mt-1 w-4 h-4 rounded border-gray-300 text-[#0c9789] focus:ring-[#0c9789] cursor-pointer accent-[#0c9789]"
                            />
                            <label htmlFor="terms" className="text-xs text-gray-500 cursor-pointer leading-relaxed">
                                <span className="text-[#0c9789] hover:underline cursor-pointer">Kullanım Koşulları</span>
                                {`'nı ve `}
                                <span className="text-[#0c9789] hover:underline cursor-pointer">Gizlilik Politikası</span>
                                {`'nı okudum, kabul ediyorum.`}
                            </label>
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
                                    Kayıt olunuyor...
                                </>
                            ) : (
                                "Kayıt Ol"
                            )}
                        </Button>
                    </form>

                    {/* Footer */}
                    <div className="text-center text-sm text-gray-500">
                        Zaten hesabınız var mı?{" "}
                        <Link href="/login" className="text-[#0c9789] hover:text-[#0a7c70] font-semibold">Giriş Yap</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
