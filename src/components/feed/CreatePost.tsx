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
        <div className="mb-6 bg-white/80 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-[#a2c1b1]/30 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <form onSubmit={handleSubmit}>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <textarea
                            className="w-full bg-transparent border-none resize-none text-stone-700 placeholder:text-stone-400 focus:ring-0 p-0 text-base sm:text-lg min-h-[60px]"
                            placeholder="Ruha iyi gelecek bir düşünce paylaşın veya fikir sorun..."
                            rows={2}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                        {imagePreview && (
                            <div className="relative mt-3 mb-2 max-w-sm rounded-xl overflow-hidden border border-stone-200 shadow-sm">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={imagePreview} alt="Preview" className="w-full h-auto object-cover max-h-48" />
                                <button
                                    type="button"
                                    onClick={clearImage}
                                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-sm"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-[#7b9e89]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                                {categories.map(c => (
                                    <Badge
                                        key={c}
                                        variant={category === c ? "default" : "outline"}
                                        className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${category === c ? 'bg-stone-800 text-white hover:bg-stone-700 border-0 shadow-sm' : 'text-stone-600 bg-stone-50 hover:bg-[#eaf2ed] hover:text-[#7b9e89] border border-[#a2c1b1]/20'}`}
                                        onClick={() => setCategory(c)}
                                    >
                                        {c}
                                    </Badge>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 sm:ml-auto shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                                <div className="flex items-center gap-1">
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
                                            className="p-2 sm:p-2.5 flex items-center justify-center text-[#7b9e89] hover:bg-[#7b9e89]/10 rounded-xl transition-colors cursor-pointer"
                                            title="Görsel Ekle"
                                        >
                                            <ImageIcon className="h-5 w-5" />
                                        </label>
                                    </div>

                                    <div className="flex items-center gap-2 mx-1 px-2.5 py-1.5 rounded-xl border border-stone-100 bg-stone-50 hover:bg-stone-100 transition-colors">
                                        <input
                                            type="checkbox"
                                            id="anonymous"
                                            checked={isAnonymous}
                                            onChange={(e) => setIsAnonymous(e.target.checked)}
                                            className="w-4 h-4 rounded border-stone-300 text-[#7b9e89] focus:ring-[#7b9e89] accent-[#7b9e89]"
                                        />
                                        <label htmlFor="anonymous" className="text-xs font-medium text-stone-600 cursor-pointer select-none">
                                            Anonim
                                        </label>
                                    </div>
                                </div>

                                <Button type="submit" disabled={!content.trim() || loading} className="gap-2 bg-[#7b9e89] hover:bg-[#6ba88f] text-white rounded-xl px-6 h-10 shadow-md shadow-[#7b9e89]/20 font-bold transition-all hover:scale-[1.02] active:scale-[0.98]">
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Paylaş"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
