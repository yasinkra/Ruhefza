"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SignupPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [role, setRole] = useState("parent"); // 'parent', 'teacher', 'student'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Clear any existing session when visiting signup page to avoid confusion
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
            // Role specific validation
            if (role === 'student' && !email.toLowerCase().endsWith('.edu.tr')) {
                throw new Error("Öğrenci hesabı oluşturmak için lütfen '.edu.tr' uzantılı üniversite e-posta adresinizi kullanın.");
            }

            const isStudent = role === 'student';
            // Students are auto-approved, teachers are pending docs, parents need no verification
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

            // The DB trigger creates the profile row initially. We update it with the specific role info.
            if (data.user) {
                const { error: profileError } = await createClient()
                    .from('profiles')
                    .update({
                        full_name: fullName,
                        role: role,
                        verification_status: initialVerificationStatus,
                        is_verified_expert: isStudent // Auto-grant expert badge for students
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

    return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
            <div className="w-full max-w-md space-y-8">
                <div className="flex flex-col items-center">
                    <Link href="/" className="flex items-center gap-2 mb-6">
                        <Heart className="h-8 w-8 text-teal-500 fill-teal-100" />
                        <span className="text-2xl font-bold text-stone-800 tracking-tight">
                            Ruhefza<span className="text-teal-600">App</span>
                        </span>
                    </Link>
                </div>

                <Card>
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl text-center">Hesap Oluştur</CardTitle>
                        <CardDescription className="text-center">
                            Topluluğumuza katılmak için bilgilerinizi girin
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSignup} className="space-y-4">
                            <div className="space-y-4">
                                <Input
                                    type="text"
                                    placeholder="Ad Soyad"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-stone-700">Hesap Türü</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <label className={`flex flex-col items-center justify-center p-3 border rounded-xl cursor-pointer transition-all ${role === 'parent' ? 'border-teal-500 bg-teal-50 outline-2 outline-teal-500' : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'}`}>
                                        <input type="radio" name="role" value="parent" className="sr-only" checked={role === 'parent'} onChange={() => setRole('parent')} />
                                        <span className="font-semibold text-sm text-stone-800">Ebeveyn</span>
                                        <span className="text-[10px] text-stone-500 text-center mt-1">Sadece öğrenme ve destek için</span>
                                    </label>
                                    <label className={`flex flex-col items-center justify-center p-3 border rounded-xl cursor-pointer transition-all ${role === 'teacher' ? 'border-teal-500 bg-teal-50 outline-2 outline-teal-500' : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'}`}>
                                        <input type="radio" name="role" value="teacher" className="sr-only" checked={role === 'teacher'} onChange={() => setRole('teacher')} />
                                        <span className="font-semibold text-sm text-stone-800">Öğretmen</span>
                                        <span className="text-[10px] text-stone-500 text-center mt-1">Özel Eğitim Öğretmeni</span>
                                    </label>
                                    <label className={`flex flex-col items-center justify-center p-3 border rounded-xl cursor-pointer transition-all ${role === 'student' ? 'border-teal-500 bg-teal-50 outline-2 outline-teal-500' : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'}`}>
                                        <input type="radio" name="role" value="student" className="sr-only" checked={role === 'student'} onChange={() => setRole('student')} />
                                        <span className="font-semibold text-sm text-stone-800">Öğrenci</span>
                                        <span className="text-[10px] text-stone-500 text-center mt-1">.edu.tr mail zorunlu</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Input
                                    type="email"
                                    placeholder="E-posta adresi"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Input
                                    type="password"
                                    placeholder="Şifre"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            {error && (
                                <div className="text-sm text-red-500 font-medium">
                                    {error}
                                </div>
                            )}

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Kayıt olunuyor...
                                    </>
                                ) : (
                                    "Kayıt Ol"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 text-center">
                        <div className="text-sm text-stone-500">
                            Zaten hesabınız var mı?{" "}
                            <Link href="/login" className="text-teal-600 hover:underline font-medium">
                                Giriş Yapın
                            </Link>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
