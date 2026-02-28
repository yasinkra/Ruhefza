"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Baby, GraduationCap, Check } from "lucide-react";
import { cn } from "@/utils/cn";

type UserRole = "parent" | "teacher" | null;

export default function OnboardingPage() {
    const router = useRouter();
    const [role, setRole] = useState<UserRole>(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: "",
        specialNote: "", // child needs or teacher specialization
    });

    const handleSubmit = async () => {
        if (!role) return;
        setLoading(true);

        // Here we would normally update the profile in Supabase
        // const { error } = await supabase.from('profiles').upsert({ ... })

        // For now, simulate delay and redirect
        setTimeout(() => {
            setLoading(false);
            router.push("/feed");
        }, 1000);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4 py-8">
            <div className="w-full max-w-2xl space-y-8">

                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-stone-800">Hoş Geldiniz!</h1>
                    <p className="text-stone-600">Size en uygun deneyimi sunabilmemiz için birkaç soru.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Rolünüzü Seçin</CardTitle>
                        <CardDescription>
                            Bu platformu hangi amaçla kullanacaksınız?
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                                onClick={() => setRole("parent")}
                                className={cn(
                                    "flex flex-col items-center justify-center p-6 border-2 rounded-xl transition-all hover:bg-teal-50",
                                    role === "parent" ? "border-teal-500 bg-teal-50 ring-2 ring-teal-200" : "border-stone-200 bg-white"
                                )}
                            >
                                <div className={cn("p-4 rounded-full mb-4", role === "parent" ? "bg-teal-100" : "bg-stone-100")}>
                                    <Baby className={cn("h-8 w-8", role === "parent" ? "text-teal-600" : "text-stone-500")} />
                                </div>
                                <span className="font-semibold text-lg text-stone-900">Veliyim</span>
                                <span className="text-sm text-stone-500 text-center mt-2">Özel gereksinimli bir çocuğum var</span>
                                {role === "parent" && <div className="absolute top-4 right-4 text-teal-600"><Check className="h-5 w-5" /></div>}
                            </button>

                            <button
                                onClick={() => setRole("teacher")}
                                className={cn(
                                    "flex flex-col items-center justify-center p-6 border-2 rounded-xl transition-all hover:bg-orange-50",
                                    role === "teacher" ? "border-orange-500 bg-orange-50 ring-2 ring-orange-200" : "border-stone-200 bg-white"
                                )}
                            >
                                <div className={cn("p-4 rounded-full mb-4", role === "teacher" ? "bg-orange-100" : "bg-stone-100")}>
                                    <GraduationCap className={cn("h-8 w-8", role === "teacher" ? "text-orange-600" : "text-stone-500")} />
                                </div>
                                <span className="font-semibold text-lg text-stone-900">Eğitmenim</span>
                                <span className="text-sm text-stone-500 text-center mt-2">Özel eğitim öğretmeniyim</span>
                            </button>
                        </div>

                        {role && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="border-t border-stone-100 pt-6"></div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        Adınız Soyadınız
                                    </label>
                                    <Input
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        placeholder="Ad Soyad"
                                    />
                                </div>

                                {role === "parent" ? (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium leading-none">
                                            Çocuğunuzun özel gereksinimi nedir?
                                        </label>
                                        <Input
                                            value={formData.specialNote}
                                            onChange={(e) => setFormData({ ...formData, specialNote: e.target.value })}
                                            placeholder="Örn: Otizm, Down Sendromu, Disleksi..."
                                        />
                                        <p className="text-[0.8rem] text-stone-500">
                                            Bu bilgi size uygun içerikleri göstermemize yardımcı olur.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium leading-none">
                                            Uzmanlık Alanınız / Branşınız
                                        </label>
                                        <Input
                                            value={formData.specialNote}
                                            onChange={(e) => setFormData({ ...formData, specialNote: e.target.value })}
                                            placeholder="Örn: Zihinsel Engelliler, İşitme Engelliler..."
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                    </CardContent>
                    <CardFooter className="flex justify-end">
                        <Button
                            onClick={handleSubmit}
                            disabled={!role || loading}
                            className={cn("w-full sm:w-auto transition-all", role === "teacher" ? "bg-orange-600 hover:bg-orange-700" : "")}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Kaydediliyor...
                                </>
                            ) : (
                                "Devam Et"
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
