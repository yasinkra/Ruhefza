"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function CreateArticlePage() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [summary, setSummary] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("Genel");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Giriş yapmalısınız");

            const { error } = await supabase.from("articles").insert({
                title,
                summary,
                content,
                category,
                author_id: user.id
            });

            if (error) throw error;

            toast.success("Makale başarıyla yayınlandı!");
            router.push("/knowledge");
        } catch (error) {
            console.error("Error creating article:", error);
            toast.error("Makale oluşturulurken bir hata oluştu: " + (error as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppShell>
            <div className="max-w-3xl mx-auto">
                <div className="mb-6 flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4 mr-1" /> Geri
                    </Button>
                    <h1 className="text-2xl font-bold text-slate-800">Yeni Bilgi Paylaş</h1>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Başlık</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Örn: Otizm ve İletişim Stratejileri"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Kategori</Label>
                            <Input
                                id="category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                placeholder="Örn: İletişim, Eğitim, Beslenme"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="summary">Özet (Giriş Kısmı)</Label>
                            <Textarea
                                id="summary"
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                                placeholder="Makalenin kısa bir özeti..."
                                rows={3}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="content">İçerik</Label>
                            <Textarea
                                id="content"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Detaylı bilgileri buraya yazın..."
                                className="min-h-[300px]"
                                required
                            />
                            <p className="text-xs text-slate-500">
                                Markdown formatını destekler. (Opsiyonel)
                            </p>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={() => router.back()}>
                                İptal
                            </Button>
                            <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Yayınlanıyor...
                                    </>
                                ) : (
                                    "Yayınla"
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AppShell>
    );
}
