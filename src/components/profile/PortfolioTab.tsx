"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, FileText, Image as ImageIcon, Video, BookOpen, ExternalLink, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { AddPortfolioItemModal } from "./AddPortfolioItemModal";

interface PortfolioItem {
    id: string;
    user_id: string;
    type: "article_link" | "video_link" | "image" | "document";
    title: string;
    description: string | null;
    article_id: string | null;
    video_url: string | null;
    video_platform: string | null;
    file_url: string | null;
    file_name: string | null;
    file_size_bytes: number | null;
    created_at: string;
    // Joined article info (when fetched)
    article?: { title: string; category: string; id: string } | null;
}

type Category = "all" | "article_link" | "video_link" | "image" | "document";

const CATEGORIES: { key: Category; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "Tümü", icon: null },
    { key: "article_link", label: "Makaleler", icon: <BookOpen className="h-3.5 w-3.5" /> },
    { key: "video_link", label: "Videolar", icon: <Video className="h-3.5 w-3.5" /> },
    { key: "image", label: "Görseller", icon: <ImageIcon className="h-3.5 w-3.5" /> },
    { key: "document", label: "Belgeler", icon: <FileText className="h-3.5 w-3.5" /> },
];

function getYouTubeEmbedId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?]+)/);
    return match ? match[1] : null;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface PortfolioTabProps {
    userId: string;
    isOwner: boolean;
    role: string | null;
}

export function PortfolioTab({ userId, isOwner, role }: PortfolioTabProps) {
    const [items, setItems] = useState<PortfolioItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<Category>("all");
    const [showAddModal, setShowAddModal] = useState(false);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    const fetchItems = async () => {
        const { data, error } = await createClient()
            .from("portfolio_items")
            .select("*")
            .eq("user_id", userId)
            .order("display_order", { ascending: true })
            .order("created_at", { ascending: false });

        if (error) { setLoading(false); return; }

        // Fetch linked articles separately for article_link items
        const articleIds = (data || [])
            .filter(i => i.type === "article_link" && i.article_id)
            .map(i => i.article_id as string);

        let articlesMap: Record<string, { title: string; category: string; id: string }> = {};
        if (articleIds.length > 0) {
            const { data: articles } = await createClient()
                .from("articles")
                .select("id, title, category")
                .in("id", articleIds);
            if (articles) {
                articlesMap = Object.fromEntries(articles.map(a => [a.id, a]));
            }
        }

        const enriched = (data || []).map(item => ({
            ...item,
            article: item.article_id ? articlesMap[item.article_id] || null : null,
        }));
        setItems(enriched as PortfolioItem[]);
        setLoading(false);
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchItems();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const handleDelete = async (item: PortfolioItem) => {
        if (!confirm("Bu öğeyi portföyünüzden kaldırmak istiyor musunuz?")) return;

        // Delete file from storage if applicable
        if ((item.type === "image" || item.type === "document") && item.file_url) {
            const path = item.file_url.split("/portfolio-files/")[1];
            if (path) await createClient().storage.from("portfolio-files").remove([path]);
        }

        const { error } = await createClient().from("portfolio_items").delete().eq("id", item.id);
        if (!error) {
            setItems(prev => prev.filter(i => i.id !== item.id));
            toast.success("Portföyden kaldırıldı.");
        } else {
            toast.error("Kaldırılamadı: " + error.message);
        }
    };

    const filtered = activeCategory === "all" ? items : items.filter(i => i.type === activeCategory);

    // Determine what tabs to show based on existing items + role
    const availableCategories = CATEGORIES.filter(cat => {
        if (cat.key === "all") return items.length > 0;
        if (isOwner) {
            // Show tab if items exist OR user can add that type
            const hasItems = items.some(i => i.type === cat.key);
            const canAdd = getAllowedTypes(role).includes(cat.key as PortfolioItem["type"]);
            return hasItems || canAdd;
        }
        return items.some(i => i.type === cat.key);
    });

    if (loading) return (
        <div className="py-6 space-y-6">
            <div className="flex gap-2">
                <div className="h-8 w-20 bg-gray-100 rounded-full animate-pulse" />
                <div className="h-8 w-24 bg-gray-100 rounded-full animate-pulse" />
                <div className="h-8 w-24 bg-gray-100 rounded-full animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-gray-50 rounded-2xl border border-gray-100 p-4 h-32 flex flex-col justify-between animate-pulse">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                            <div className="flex-1 space-y-2 py-1">
                                <div className="h-3 bg-gray-200 rounded-full w-2/3" />
                                <div className="h-2 bg-gray-200 rounded-full w-1/2" />
                            </div>
                        </div>
                        <div className="flex justify-end pt-2 border-t border-gray-100/50 mt-auto">
                            <div className="h-6 w-16 bg-gray-200 rounded-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex flex-wrap gap-2 flex-1">
                    {availableCategories.map(cat => (
                        <button
                            key={cat.key}
                            onClick={() => setActiveCategory(cat.key)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                                activeCategory === cat.key
                                    ? "bg-[#0c9789] text-white shadow-sm"
                                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            )}
                        >
                            {cat.icon}
                            {cat.label}
                            {cat.key !== "all" && (
                                <span className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded-full ml-0.5",
                                    activeCategory === cat.key ? "bg-white/20 text-white" : "bg-white text-gray-500"
                                )}>
                                    {items.filter(i => i.type === cat.key).length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
                {isOwner && (
                    <Button
                        onClick={() => setShowAddModal(true)}
                        size="sm"
                        className="bg-[#0c9789] hover:bg-[#0a7c70] text-white rounded-xl font-bold shadow-sm shrink-0"
                    >
                        <Plus className="h-4 w-4 mr-1" /> Ekle
                    </Button>
                )}
            </div>

            {/* Empty state */}
            {filtered.length === 0 && (
                <div className="text-center py-20 bg-gradient-to-br from-gray-50 to-white rounded-[32px] border border-dashed border-gray-200 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#0c9789]/10 rounded-full blur-3xl -mr-20 -mt-20 transition-transform group-hover:scale-110 duration-700"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#0c9789]/10 rounded-full blur-3xl -ml-20 -mb-20 transition-transform group-hover:scale-110 duration-700"></div>

                    <div className="mx-auto w-32 h-32 relative mb-6">
                        <div className="absolute inset-0 bg-[#14b8a6]/30 rounded-full animate-ping opacity-20 duration-1000"></div>
                        <div className="relative w-full h-full bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center">
                            {activeCategory === "article_link" ? <BookOpen className="h-10 w-10 text-[#0c9789]" /> :
                                activeCategory === "video_link" ? <Video className="h-10 w-10 text-[#e89b7b]" /> :
                                    activeCategory === "image" ? <ImageIcon className="h-10 w-10 text-[#0c9789]" /> :
                                        activeCategory === "document" ? <FileText className="h-10 w-10 text-[#fcdb9d]" /> :
                                            <div className="grid grid-cols-2 gap-2 p-2">
                                                <div className="w-8 h-8 rounded-lg bg-[#f0fdfa] flex items-center justify-center"><BookOpen className="h-4 w-4 text-[#0c9789]" /></div>
                                                <div className="w-8 h-8 rounded-lg bg-[#fcece6] flex items-center justify-center"><Video className="h-4 w-4 text-[#e89b7b]" /></div>
                                                <div className="w-8 h-8 rounded-lg bg-[#f0fdfa] flex items-center justify-center"><ImageIcon className="h-4 w-4 text-[#0c9789]" /></div>
                                                <div className="w-8 h-8 rounded-lg bg-[#fff7e6] flex items-center justify-center"><FileText className="h-4 w-4 text-[#e8c87b]" /></div>
                                            </div>}
                        </div>
                    </div>

                    <h3 className="text-xl font-black text-gray-800 mb-2 relative z-10">
                        {isOwner ? "Portföyünüz Henüz Boş" : "İçerik Bulunamadı"}
                    </h3>
                    <p className="text-sm font-medium text-gray-500 max-w-sm mx-auto relative z-10">
                        {isOwner
                            ? "Çalışmalarınızı, başarılarınızı ve yeteneklerinizi sergilemek için hemen ilk içeriğinizi ekleyin."
                            : "Kullanıcı henüz bu kategoriye ait bir içerik eklememiş."}
                    </p>

                    {isOwner && (
                        <Button
                            onClick={() => setShowAddModal(true)}
                            className="mt-6 bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-lg shadow-slate-200 px-8 h-11 font-bold relative z-10"
                        >
                            <Plus className="h-4 w-4 mr-2" /> İlk İçeriği Ekle
                        </Button>
                    )}
                </div>
            )}

            {/* Article Links */}
            {(activeCategory === "all" || activeCategory === "article_link") &&
                filtered.filter(i => i.type === "article_link").length > 0 && (
                    <div className="mb-8">
                        {activeCategory === "all" && (
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-1 h-5 bg-[#0c9789] rounded-full" />
                                <h3 className="font-bold text-gray-700 text-xs uppercase tracking-widest flex items-center gap-1.5">
                                    <BookOpen className="h-3.5 w-3.5" /> Makaleler
                                </h3>
                            </div>
                        )}
                        <div className="grid grid-cols-1 gap-3">
                            {filtered.filter(i => i.type === "article_link").map(item => (
                                <div key={item.id} className="group flex items-start gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-[#14b8a6] hover:shadow-md transition-all">
                                    <div className="w-10 h-10 bg-[#f0fdfa] rounded-xl flex items-center justify-center shrink-0">
                                        <BookOpen className="h-5 w-5 text-[#0c9789]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-[#0c9789] font-bold">{item.article?.category || "Makale"}</p>
                                        <h4 className="font-bold text-gray-900 text-sm mt-0.5 line-clamp-1">{item.article?.title || item.title}</h4>
                                        {item.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {item.article_id && (
                                            <a href={`/knowledge/${item.article_id}`} target="_blank" rel="noopener noreferrer"
                                                className="p-1.5 rounded-full text-gray-400 hover:text-[#0c9789] hover:bg-[#f0fdfa] transition-colors">
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        )}
                                        {isOwner && (
                                            <button onClick={() => handleDelete(item)}
                                                className="p-1.5 rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            {/* Video Links */}
            {(activeCategory === "all" || activeCategory === "video_link") &&
                filtered.filter(i => i.type === "video_link").length > 0 && (
                    <div className="mb-8">
                        {activeCategory === "all" && (
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-1 h-5 bg-[#e89b7b] rounded-full" />
                                <h3 className="font-bold text-gray-700 text-xs uppercase tracking-widest flex items-center gap-1.5">
                                    <Video className="h-3.5 w-3.5" /> Videolar
                                </h3>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filtered.filter(i => i.type === "video_link").map(item => {
                                const ytId = item.video_url ? getYouTubeEmbedId(item.video_url) : null;
                                return (
                                    <div key={item.id} className="group bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all overflow-hidden">
                                        {ytId ? (
                                            <div className="aspect-video bg-black relative">
                                                <iframe
                                                    src={`https://www.youtube.com/embed/${ytId}`}
                                                    className="w-full h-full"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                />
                                            </div>
                                        ) : (
                                            <a href={item.video_url || "#"} target="_blank" rel="noopener noreferrer"
                                                className="block aspect-video bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                                                <div className="text-center text-white">
                                                    <Video className="h-8 w-8 mx-auto mb-2 opacity-80" />
                                                    <p className="text-xs font-bold opacity-80">Instagram / Diğer</p>
                                                </div>
                                            </a>
                                        )}
                                        <div className="p-3 flex items-center justify-between">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-sm text-gray-900 line-clamp-1">{item.title}</p>
                                                {item.description && <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{item.description}</p>}
                                            </div>
                                            <div className="flex items-center gap-1 ml-2">
                                                <a href={item.video_url || "#"} target="_blank" rel="noopener noreferrer"
                                                    className="p-1.5 rounded-full text-gray-400 hover:text-[#0c9789] transition-colors">
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                </a>
                                                {isOwner && (
                                                    <button onClick={() => handleDelete(item)}
                                                        className="p-1.5 rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

            {/* Images */}
            {(activeCategory === "all" || activeCategory === "image") &&
                filtered.filter(i => i.type === "image").length > 0 && (
                    <div className="mb-8">
                        {activeCategory === "all" && (
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-1 h-5 bg-[#0c9789] rounded-full" />
                                <h3 className="font-bold text-gray-700 text-xs uppercase tracking-widest flex items-center gap-1.5">
                                    <ImageIcon className="h-3.5 w-3.5" /> Görseller
                                </h3>
                            </div>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {filtered.filter(i => i.type === "image").map(item => (
                                <div key={item.id} className="group relative aspect-square bg-gray-100 rounded-2xl overflow-hidden cursor-pointer"
                                    onClick={() => setLightboxUrl(item.file_url)}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={item.file_url || ""} alt={item.title}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                                        <div className="w-full p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                                            <p className="text-white text-xs font-bold truncate">{item.title}</p>
                                        </div>
                                    </div>
                                    {isOwner && (
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                                            className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            {/* Documents */}
            {(activeCategory === "all" || activeCategory === "document") &&
                filtered.filter(i => i.type === "document").length > 0 && (
                    <div className="mb-8">
                        {activeCategory === "all" && (
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-1 h-5 bg-[#e8c87b] rounded-full" />
                                <h3 className="font-bold text-gray-700 text-xs uppercase tracking-widest flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5" /> Belgeler
                                </h3>
                            </div>
                        )}
                        <div className="grid grid-cols-1 gap-3">
                            {filtered.filter(i => i.type === "document").map(item => (
                                <div key={item.id} className="group flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-[#fcdb9d] hover:shadow-md transition-all">
                                    <div className="w-10 h-10 bg-[#fcece6] rounded-xl flex items-center justify-center shrink-0">
                                        <FileText className="h-5 w-5 text-[#e89b7b]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-gray-900 truncate">{item.title}</p>
                                        {item.file_name && (
                                            <p className="text-xs text-gray-400 truncate">{item.file_name}</p>
                                        )}
                                        {item.file_size_bytes && (
                                            <p className="text-xs text-gray-400">{formatFileSize(item.file_size_bytes)}</p>
                                        )}
                                        {item.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{item.description}</p>}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <a href={item.file_url || "#"} download={item.file_name || "document"} target="_blank" rel="noopener noreferrer"
                                            className="p-1.5 rounded-full text-gray-400 hover:text-[#e8c87b] hover:bg-[#fff7e6] transition-colors"
                                            onClick={e => e.stopPropagation()}>
                                            <Download className="h-4 w-4" />
                                        </a>
                                        {isOwner && (
                                            <button onClick={() => handleDelete(item)}
                                                className="p-1.5 rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            {/* Lightbox */}
            {lightboxUrl && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                    onClick={() => setLightboxUrl(null)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={lightboxUrl} alt="Görsel"
                        className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                        onClick={e => e.stopPropagation()} />
                    <button onClick={() => setLightboxUrl(null)}
                        className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <AddPortfolioItemModal
                    userId={userId}
                    role={role}
                    onClose={() => setShowAddModal(false)}
                    onAdded={() => { fetchItems(); setShowAddModal(false); }}
                />
            )}
        </>
    );
}

function getAllowedTypes(role: string | null): PortfolioItem["type"][] {
    if (role === "teacher" || role === "student") {
        return ["article_link", "video_link", "image", "document"];
    }
    // parent
    return ["image", "document"];
}
