"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UploadCloud, ShieldAlert, ShieldCheck, Clock } from "lucide-react";
import { toast } from "sonner";

interface VerificationStatusProps {
    userId: string;
    role: 'parent' | 'teacher' | 'student' | null;
    status: 'none' | 'unverified' | 'pending' | 'approved';
    onStatusChange: (newStatus: 'none' | 'unverified' | 'pending' | 'approved') => void;
}

export function VerificationStatus({ userId, role, status, onStatusChange }: VerificationStatusProps) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    // Only teachers need manual document verification
    if (role !== 'teacher') return null;

    if (status === 'approved') {
        return (
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3 mb-6">
                <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
                    <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                    <h4 className="text-emerald-800 font-semibold text-sm">Doğrulanmış Uzman</h4>
                    <p className="text-emerald-600 inline-flex items-center gap-2 text-xs">
                        Hesabınız onaylanmıştır. Topluluk akışına içerik ekleyebilirsiniz.
                    </p>
                </div>
            </div>
        );
    }

    if (status === 'pending') {
        return (
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center gap-3 mb-6">
                <div className="bg-amber-100 p-2 rounded-full text-amber-600">
                    <Clock className="h-5 w-5" />
                </div>
                <div>
                    <h4 className="text-amber-800 font-semibold text-sm">İnceleme Bekleniyor</h4>
                    <p className="text-amber-600 text-xs mt-0.5">
                        Belgeleriniz alındı. Yönetici onayının ardından hesabınız doğrulanacaktır.
                    </p>
                </div>
            </div>
        );
    }

    const handleUpload = async () => {
        if (!file) return;

        // Check file size (e.g., max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Dosya boyutu 5MB'dan küçük olmalıdır.");
            return;
        }

        setUploading(true);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload document
            const { error: uploadError, data } = await supabase.storage
                .from("verification_documents")
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Update profile status and save the file path for admin
            const { error: updateError } = await supabase
                .from("profiles")
                .update({
                    verification_status: 'pending',
                    verification_document_url: data?.path
                })
                .eq("id", userId);

            if (updateError) throw updateError;

            onStatusChange('pending');
            toast.success("Belgeniz başarıyla yüklendi. Onay süreci başladı.");

        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Belge yüklenirken bir hata oluştu: " + (error as Error).message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <Card className="mb-6 border-sky-100 bg-sky-50/30 overflow-hidden shadow-sm">
            <CardHeader className="pb-3 border-b border-sky-100/50 bg-white">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-sky-500" />
                    <CardTitle className="text-base text-slate-800 tracking-tight">Uzman Doğrulaması Gerekli</CardTitle>
                </div>
                <CardDescription className="text-xs text-slate-500 mt-1">
                    Topluluk akışına gönderi ekleyebilmek için lütfen diploması veya mesleki kimlik belgenizi yükleyiniz.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="flex-1 w-full">
                        <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${file ? 'border-sky-400 bg-sky-50' : 'border-slate-300 hover:bg-slate-50 bg-white'}`}>
                            <div className="flex flex-col items-center justify-center pt-5 text-center px-4">
                                <UploadCloud className={`w-6 h-6 mb-2 ${file ? 'text-sky-500' : 'text-slate-400'}`} />
                                <p className="mb-1 text-xs text-slate-500">
                                    {file ? (
                                        <span className="font-semibold text-sky-600">{file.name}</span>
                                    ) : (
                                        <>Belge seçmek için <span className="font-semibold text-sky-600">tıklayın</span> veya sürükleyin</>
                                    )}
                                </p>
                            </div>
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        setFile(e.target.files[0]);
                                    }
                                }}
                            />
                        </label>
                    </div>
                    <Button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white shrink-0"
                    >
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Gönder"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
