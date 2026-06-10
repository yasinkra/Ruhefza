"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Upload, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

const SPECIAL_EDUCATION_CATEGORIES = [
    "Otizm Spektrum Bozukluğu",
    "DEHB (Dikkat Eksikliği ve Hiperaktivite)",
    "Özgül Öğrenme Güçlüğü",
    "Zihinsel Yetersizlik",
    "İşitme Yetersizliği",
    "Görme Yetersizliği",
    "Fiziksel Yetersizlik",
    "Dil ve Konuşma Bozuklukları",
    "Üstün Zekalılar ve Yetenekliler",
    "Erken Çocuklukta Özel Eğitim",
    "Davranış Bozuklukları",
    "Kaynaştırma ve Bütünleştirme",
    "Aile Eğitimi ve Danışmanlığı",
    "BEP Hazırlama Süreçleri",
    "Duyu Bütünleme",
    "Genel"
];

export default function CreateArticlePage() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [summary, setSummary] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("Genel");
    const [loading, setLoading] = useState(false);

    // New states for PDF / document upload
    const [postType, setPostType] = useState<"text" | "file">("text");
    const [file, setFile] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (postType === "file" && !file) {
            toast.error("Lütfen yüklemek için bir dosya seçin.");
            return;
        }

        setLoading(true);

        try {
            const { data: { user } } = await createClient().auth.getUser();
            if (!user) throw new Error("Giriş yapmalısınız");

            let fileUrl = null;
            let fileName = null;
            let finalContent = content;

            if (postType === "file" && file) {
                const ext = file.name.split(".").pop();
                const filePath = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;
                const { error: uploadError } = await createClient().storage
                    .from("portfolio-files")
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = createClient().storage.from("portfolio-files").getPublicUrl(filePath);
                fileUrl = publicUrl;
                fileName = file.name;

                // For backward compatibility / display in other areas
                finalContent = `Bu paylaşım bir dosya/belge içermektedir.

[Belgeyi İndir / Görüntüle](${fileUrl})`;
            }

            const { error } = await createClient().from("articles").insert({
                title,
                summary,
                content: finalContent,
                category,
                author_id: user.id,
                file_url: fileUrl,
                file_name: fileName
            });

            if (error) throw error;

            toast.success(postType === "file" ? "Belge başarıyla yüklendi!" : "Makale başarıyla yayınlandı!");
            router.push("/knowledge");
        } catch (error) {
            console.error("Error creating article:", error);
            toast.error("Paylaşım oluşturulurken bir hata oluştu: " + (error as Error).message);
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
                    <h1 className="text-2xl font-bold text-gray-800">Yeni Bilgi Paylaş</h1>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
                    {/* Share Type Selector */}
                    <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
                        <button
                            type="button"
                            onClick={() => setPostType("text")}
                            className={cn(
                                "flex-1 py-2.5 text-sm font-bold rounded-lg transition-all",
                                postType === "text"
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-900"
                            )}
                        >
                            Yazı Paylaş
                        </button>
                        <button
                            type="button"
                            onClick={() => setPostType("file")}
                            className={cn(
                                "flex-1 py-2.5 text-sm font-bold rounded-lg transition-all",
                                postType === "file"
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-900"
                            )}
                        >
                            Dosya / Belge Yükle (PDF)
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* File upload input */}
                        {postType === "file" && (
                            <div className="space-y-2">
                                <Label>Belge / PDF Seç (Maks 20 MB)</Label>
                                <label className={cn(
                                    "flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-colors min-h-[160px]",
                                    file ? "border-teal-300 bg-teal-50" : "border-slate-200 hover:border-teal-300 hover:bg-teal-50/50"
                                )}>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) {
                                                if (f.size > 20 * 1024 * 1024) {
                                                    toast.error("Dosya boyutu en fazla 20 MB olabilir.");
                                                    return;
                                                }
                                                setFile(f);
                                                if (!title) {
                                                    setTitle(f.name.replace(/\.[^.]+$/, ""));
                                                }
                                            }
                                        }}
                                    />
                                    {file ? (
                                        <div className="text-center relative w-full px-8">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setFile(null);
                                                }}
                                                className="absolute -top-4 right-0 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                                                title="Dosyayı kaldır"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                            <FileText className="h-10 w-10 text-teal-500 mx-auto mb-2 animate-bounce" />
                                            <p className="text-base font-bold text-teal-700 truncate">{file.name}</p>
                                            <p className="text-xs text-slate-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <Upload className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                                            <p className="text-sm text-slate-500 font-bold">Dosya seçmek veya sürüklemek için tıklayın</p>
                                            <p className="text-xs text-slate-400 mt-1">Desteklenen formatlar: PDF, Word, Excel, PowerPoint</p>
                                        </div>
                                    )}
                                </label>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="title">Başlık</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={postType === "file" ? "Belge için bir başlık yazın..." : "Örn: Otizm ve İletişim Stratejileri"}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Kategori</Label>
                            <Input
                                id="category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                placeholder="Listeden seçin veya kendi kategorinizi yazın..."
                                list="knowledge-categories"
                                required
                            />
                            <datalist id="knowledge-categories">
                                {SPECIAL_EDUCATION_CATEGORIES.map(cat => (
                                    <option key={cat} value={cat} />
                                ))}
                            </datalist>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="summary">Özet (Giriş Kısmı)</Label>
                            <Textarea
                                id="summary"
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                                placeholder={postType === "file" ? "Yüklediğiniz belgenin içeriği hakkında kısa bir açıklama..." : "Makalenin kısa bir özeti..."}
                                rows={3}
                                required
                            />
                        </div>

                        {postType === "text" && (
                            <div className="space-y-2">
                                <Label htmlFor="content">İçerik</Label>
                                <Textarea
                                    id="content"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Detaylı bilgileri buraya yazın..."
                                    className="min-h-[300px]"
                                    required={postType === "text"}
                                />
                                <p className="text-xs text-gray-500">
                                    Markdown formatını destekler. (Opsiyonel)
                                </p>
                            </div>
                        )}

                        <div className="pt-4 flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={() => router.back()}>
                                İptal
                            </Button>
                            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Yayınlanıyor...
                                    </>
                                ) : (
                                    postType === "file" ? "Yükle ve Yayınla" : "Yayınla"
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AppShell>
    );
}
