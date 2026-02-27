"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Tag, Image as ImageIcon, X } from "lucide-react";


export function CreatePost({ onPostCreated }: { onPostCreated: () => void }) {
    const [content, setContent] = useState("");
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [loading, setLoading] = useState(false);
    const [category, setCategory] = useState<string>("Genel");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const categories = ["Genel", "Soru", "Tavsiye", "Materyal", "Etkinlik", "Başarı Hikayesi"];

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                alert("Dosya boyutu 5MB'dan küçük olmalıdır.");
                return;
            }
            setImageFile(file);
            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);
        }
    };

    const clearImage = () => {
        setImageFile(null);
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }
        setImagePreview(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        setLoading(true);
        try {
            const { data: { user } } = await createClient().auth.getUser();

            if (!user) {
                alert("Lütfen önce giriş yapın.");
                return;
            }

            // First check if profile exists, if not create one (fallback for trigger issues)
            // Ideally this is handled by database triggers, but robustness helps.

            let imageUrl = null;

            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
                const filePath = `${user.id}/${fileName}`;

                const { error: uploadError } = await createClient().storage
                    .from('post-images')
                    .upload(filePath, imageFile);

                if (uploadError) {
                    console.error("Error uploading image:", uploadError);
                    throw new Error("Görsel yüklenirken bir hata oluştu.");
                }

                const { data: { publicUrl } } = createClient().storage
                    .from('post-images')
                    .getPublicUrl(filePath);

                imageUrl = publicUrl;
            }

            const { error } = await createClient().from("posts").insert({
                content,
                author_id: user.id,
                is_anonymous: isAnonymous,
                category: category,
                image_url: imageUrl
            });

            if (error) throw error;

            setContent("");
            setIsAnonymous(false);
            clearImage();
            onPostCreated();
        } catch (error) {
            console.error("Error creating post:", error);
            alert("Gönderi paylaşılırken bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="mb-6 border-sky-100 shadow-sm">
            <CardContent className="pt-6">
                <form onSubmit={handleSubmit}>
                    <textarea
                        className="w-full min-h-[100px] p-3 rounded-lg border border-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-700 placeholder:text-slate-400"
                        placeholder="Düşüncelerinizi paylaşın..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                    {imagePreview && (
                        <div className="relative mt-3 mb-2 max-w-sm rounded-lg overflow-hidden border border-slate-200">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imagePreview} alt="Preview" className="w-full h-auto object-cover max-h-48" />
                            <button
                                type="button"
                                onClick={clearImage}
                                className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-4">
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <Tag className="h-4 w-4 text-slate-400" />
                                {categories.map(c => (
                                    <Badge
                                        key={c}
                                        variant={category === c ? "default" : "outline"}
                                        className={`cursor-pointer ${category === c ? 'bg-sky-500 hover:bg-sky-600' : 'text-slate-600 hover:bg-slate-100'}`}
                                        onClick={() => setCategory(c)}
                                    >
                                        {c}
                                    </Badge>
                                ))}
                            </div>
                            <div className="flex items-center gap-4">
                                <div>
                                    <input
                                        type="file"
                                        id="image-upload"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="hidden"
                                        onChange={handleImageChange}
                                        disabled={loading}
                                    />
                                    <label
                                        htmlFor="image-upload"
                                        className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-sky-600 cursor-pointer transition-colors"
                                    >
                                        <ImageIcon className="h-4 w-4" />
                                        Görsel Ekle
                                    </label>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="anonymous"
                                        checked={isAnonymous}
                                        onChange={(e) => setIsAnonymous(e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                    />
                                    <label htmlFor="anonymous" className="text-sm text-slate-600 cursor-pointer select-none">
                                        Anonim olarak paylaş
                                    </label>
                                </div>
                            </div>
                        </div>
                        <Button type="submit" disabled={!content.trim() || loading} className="gap-2 shrink-0 self-end sm:self-auto">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Paylaş
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
