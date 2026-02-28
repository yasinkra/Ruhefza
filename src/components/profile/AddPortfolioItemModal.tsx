"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { X, BookOpen, Video, Image as ImageIcon, FileText, Upload, Link, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

type ItemType = "article_link" | "video_link" | "image" | "document";

const TYPE_CONFIG: Record<ItemType, { label: string; icon: React.ReactNode; color: string }> = {
    article_link: { label: "Makale", icon: <BookOpen className="h-5 w-5" />, color: "bg-teal-50 text-teal-600 border-teal-200" },
    video_link: { label: "Video", icon: <Video className="h-5 w-5" />, color: "bg-red-50 text-red-600 border-red-200" },
    image: { label: "Görsel", icon: <ImageIcon className="h-5 w-5" />, color: "bg-violet-50 text-violet-600 border-violet-200" },
    document: { label: "Belge (PDF)", icon: <FileText className="h-5 w-5" />, color: "bg-amber-50 text-amber-600 border-amber-200" },
};

function getAllowedTypes(role: string | null): ItemType[] {
    if (role === "teacher" || role === "student") return ["article_link", "video_link", "image", "document"];
    return ["image", "document"]; // parent
}

interface Props {
    userId: string;
    role: string | null;
    onClose: () => void;
    onAdded: () => void;
}

export function AddPortfolioItemModal({ userId, role, onClose, onAdded }: Props) {
    const [step, setStep] = useState<"type" | "form">("type");
    const [selectedType, setSelectedType] = useState<ItemType | null>(null);

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [selectedArticleId, setSelectedArticleId] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [myArticles, setMyArticles] = useState<any[]>([]);
    const [loadingArticles, setLoadingArticles] = useState(false);
    const [saving, setSaving] = useState(false);

    const allowedTypes = getAllowedTypes(role);

    useEffect(() => {
        if (selectedType === "article_link") {
            const fetchArticles = async () => {
                setLoadingArticles(true);
                const { data } = await createClient().from("articles").select("id, title, category")
                    .eq("author_id", userId)
                    .order("created_at", { ascending: false });
                setMyArticles(data || []);
                setLoadingArticles(false);
            };
            void fetchArticles();
        }
    }, [selectedType, userId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;

        const maxSize = selectedType === "image" ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
        if (f.size > maxSize) {
            toast.error(`Dosya boyutu en fazla ${selectedType === "image" ? "5" : "10"} MB olabilir.`);
            return;
        }

        setFile(f);
        if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));

        if (selectedType === "image") {
            const reader = new FileReader();
            reader.onload = (ev) => setFilePreview(ev.target?.result as string);
            reader.readAsDataURL(f);
        }
    };

    const handleSave = async () => {
        if (!selectedType) return;

        // Validation
        if (!title.trim()) { toast.error("Başlık gerekli."); return; }
        if (selectedType === "article_link" && !selectedArticleId) { toast.error("Bir makale seçin."); return; }
        if (selectedType === "video_link" && !videoUrl.trim()) { toast.error("Video URL gerekli."); return; }
        if ((selectedType === "image" || selectedType === "document") && !file) { toast.error("Dosya seçin."); return; }

        setSaving(true);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload: Record<string, any> = {
            user_id: userId,
            type: selectedType,
            title: title.trim(),
            description: description.trim() || null,
        };

        if (selectedType === "article_link") {
            payload.article_id = selectedArticleId;
        }

        if (selectedType === "video_link") {
            const url = videoUrl.trim();
            payload.video_url = url;
            if (url.includes("youtube") || url.includes("youtu.be")) payload.video_platform = "youtube";
            else if (url.includes("instagram")) payload.video_platform = "instagram";
            else payload.video_platform = "other";
        }

        if ((selectedType === "image" || selectedType === "document") && file) {
            const ext = file.name.split(".").pop();
            const filePath = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;
            const { error: uploadError } = await createClient().storage
                .from("portfolio-files")
                .upload(filePath, file);

            if (uploadError) {
                toast.error("Dosya yüklenemedi: " + uploadError.message);
                setSaving(false);
                return;
            }

            const { data: { publicUrl } } = createClient().storage.from("portfolio-files").getPublicUrl(filePath);
            payload.file_url = publicUrl;
            payload.file_name = file.name;
            payload.file_size_bytes = file.size;
        }

        const { error } = await createClient().from("portfolio_items").insert(payload);
        if (error) {
            toast.error("Kaydedilemedi: " + error.message);
        } else {
            toast.success("Portföyünüze eklendi!");
            onAdded();
        }
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                        <h2 className="font-black text-slate-900">Portföye Ekle</h2>
                        {selectedType && step === "form" && (
                            <p className="text-xs text-slate-400 mt-0.5">{TYPE_CONFIG[selectedType].label}</p>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                <div className="p-6">
                    {/* Step 1: Type Selection */}
                    {step === "type" && (
                        <div className="grid grid-cols-2 gap-3">
                            {(Object.entries(TYPE_CONFIG) as [ItemType, typeof TYPE_CONFIG[ItemType]][])
                                .filter(([k]) => allowedTypes.includes(k))
                                .map(([key, cfg]) => (
                                    <button
                                        key={key}
                                        onClick={() => { setSelectedType(key); setStep("form"); }}
                                        className={cn(
                                            "flex flex-col items-center gap-3 p-5 rounded-2xl border-2 text-center transition-all hover:-translate-y-0.5 hover:shadow-md",
                                            cfg.color
                                        )}
                                    >
                                        {cfg.icon}
                                        <span className="font-bold text-sm">{cfg.label}</span>
                                    </button>
                                ))}
                        </div>
                    )}

                    {/* Step 2: Form */}
                    {step === "form" && selectedType && (
                        <div className="space-y-4">
                            {/* Article picker */}
                            {selectedType === "article_link" && (
                                <div>
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">
                                        Makalenizi Seçin
                                    </label>
                                    {loadingArticles ? (
                                        <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                                            <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor...
                                        </div>
                                    ) : myArticles.length === 0 ? (
                                        <p className="text-sm text-slate-400 italic py-2">
                                            Henüz yayınlanmış makaleniz yok. Önce bilgi bankasına makale ekleyin.
                                        </p>
                                    ) : (
                                        <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2">
                                            {myArticles.map(art => (
                                                <button key={art.id}
                                                    onClick={() => { setSelectedArticleId(art.id); setTitle(art.title); }}
                                                    className={cn(
                                                        "w-full text-left p-3 rounded-xl transition-colors flex items-start gap-2",
                                                        selectedArticleId === art.id
                                                            ? "bg-teal-50 border-2 border-teal-400"
                                                            : "hover:bg-slate-50 border-2 border-transparent"
                                                    )}>
                                                    <BookOpen className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-xs font-bold text-teal-600">{art.category}</p>
                                                        <p className="text-sm font-medium text-slate-800 line-clamp-2">{art.title}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Video URL */}
                            {selectedType === "video_link" && (
                                <div>
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">
                                        Video URL
                                    </label>
                                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5">
                                        <Link className="h-4 w-4 text-slate-400 shrink-0" />
                                        <input
                                            type="url"
                                            value={videoUrl}
                                            onChange={e => setVideoUrl(e.target.value)}
                                            placeholder="https://youtube.com/watch?v=... veya instagram.com/reel/..."
                                            className="flex-1 text-sm bg-transparent outline-none text-slate-800 placeholder:text-slate-300"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">YouTube veya Instagram linki yapıştırın</p>
                                </div>
                            )}

                            {/* File upload */}
                            {(selectedType === "image" || selectedType === "document") && (
                                <div>
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">
                                        {selectedType === "image" ? "Görsel Seç (max 5 MB)" : "PDF Seç (max 10 MB)"}
                                    </label>
                                    <label className={cn(
                                        "flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-colors",
                                        file ? "border-teal-300 bg-teal-50" : "border-slate-200 hover:border-teal-300 hover:bg-teal-50/50"
                                    )}>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept={selectedType === "image" ? "image/jpeg,image/png,image/webp,image/gif" : "application/pdf"}
                                            onChange={handleFileChange}
                                        />
                                        {filePreview && selectedType === "image" ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={filePreview} alt="preview" className="max-h-32 rounded-xl object-contain" />
                                        ) : file ? (
                                            <div className="text-center">
                                                <FileText className="h-8 w-8 text-teal-500 mx-auto mb-1" />
                                                <p className="text-sm font-bold text-teal-700">{file.name}</p>
                                                <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="h-8 w-8 text-slate-300" />
                                                <p className="text-sm text-slate-400 font-medium">Dosya seçmek için tıklayın</p>
                                            </>
                                        )}
                                    </label>
                                </div>
                            )}

                            {/* Title */}
                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">
                                    Başlık
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Bu içerik için bir başlık..."
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-400 transition-colors"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">
                                    Açıklama <span className="text-slate-300 normal-case">(isteğe bağlı)</span>
                                </label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Kısa bir açıklama ekleyin..."
                                    rows={2}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-400 transition-colors resize-none"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <Button variant="outline" onClick={() => setStep("type")} className="flex-1 rounded-xl">
                                    ← Geri
                                </Button>
                                <Button onClick={handleSave} disabled={saving}
                                    className="flex-1 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold">
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Portföye Ekle"}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
