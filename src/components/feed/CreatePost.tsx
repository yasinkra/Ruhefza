"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Tag, Image as ImageIcon, X, Video, Paperclip, User } from "lucide-react";


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
        <div className="mb-6 bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="flex gap-3 sm:gap-4 items-start">
                    {/* User Avatar */}
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-orange-100/50 flex items-center justify-center text-[#ff8e3c]">
                        <User className="w-5 h-5" />
                    </div>

                    <div className="flex-1 w-full">
                        <textarea
                            className="w-full bg-white border border-gray-200 rounded-[14px] resize-none text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0c9789] focus:border-[#0c9789] p-3 sm:p-4 text-sm sm:text-base min-h-[60px] sm:min-h-[80px]"
                            placeholder="Bir şeyler paylaş..."
                            rows={2}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                        {imagePreview && (
                            <div className="relative mt-3 mb-2 max-w-sm rounded-xl overflow-hidden border border-gray-200 shadow-sm">
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
                    </div>
                </div>

                <div className="flex items-center justify-between pl-0 sm:pl-[56px] mt-1 sm:mt-0">
                    <div className="flex items-center gap-1 sm:gap-3 text-[#0c9789]">
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
                                className="p-2 flex items-center justify-center hover:bg-[#0c9789]/10 rounded-lg transition-colors cursor-pointer"
                                title="Görsel Ekle"
                            >
                                <ImageIcon className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={2.5} />
                            </label>
                        </div>
                        <button type="button" className="p-2 flex items-center justify-center hover:bg-[#0c9789]/10 rounded-lg transition-colors" title="Video Ekle">
                            <Video className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={2.5} />
                        </button>
                        <button type="button" className="p-2 flex items-center justify-center hover:bg-[#0c9789]/10 rounded-lg transition-colors" title="Dosya Ekle">
                            <Paperclip className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={2.5} />
                        </button>
                    </div>

                    <Button
                        type="submit"
                        disabled={!content.trim() || loading}
                        className="rounded-full px-5 sm:px-7 bg-[#0c9789] hover:bg-[#0a7c70] text-white font-medium h-9 sm:h-10 text-sm transition-all"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Paylaş"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
