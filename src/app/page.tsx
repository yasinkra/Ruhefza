"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import {
  ArrowRight,
  BookOpen,
  Users,
  MessageCircle,
  Heart,
  Shield,
  Sparkles,
  Star,
  ChevronDown,
  GraduationCap,
  Lock,
  Smartphone,
  CheckCircle,
  Play,
  Mail,
  Globe,
  Quote,
  Zap,
  TrendingUp,
  Award,
} from "lucide-react";

/* ═══════════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════════ */

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.unobserve(el); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function useCounter(end: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          let start = 0;
          const step = Math.max(1, Math.floor(end / (duration / 16)));
          const timer = setInterval(() => {
            start += step;
            if (start >= end) { setCount(end); clearInterval(timer); }
            else setCount(start);
          }, 16);
          obs.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [end, duration]);
  return { count, ref };
}

function useMouseGlow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const glow = glowRef.current;
    if (!container || !glow) return;

    const handleMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      glow.style.transform = `translate(${x - 300}px, ${y - 300}px)`;
      glow.style.opacity = "1";
    };

    const handleLeave = () => {
      glow.style.opacity = "0";
    };

    container.addEventListener("mousemove", handleMove);
    container.addEventListener("mouseleave", handleLeave);
    return () => {
      container.removeEventListener("mousemove", handleMove);
      container.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  return { containerRef, glowRef };
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */

export default function LandingPage() {
  const [user, setUser] = useState<unknown>(null);
  const [openFaq, setOpenFaq] = useState(0);
  const [activeFeature, setActiveFeature] = useState(0);
  const { containerRef, glowRef } = useMouseGlow();

  // Typewriter — ref-based to avoid React Strict Mode double-effect
  const headlines = ["Her Çocuk Özeldir.", "Her Adım Değerlidir.", "Birlikte Güçlüyüz."];
  const [displayText, setDisplayText] = useState("");
  const typewriterRef = useRef({ idx: 0, charPos: 0, deleting: false, lastTime: 0, paused: false, pauseUntil: 0 });

  useEffect(() => {
    let animId: number;
    const animate = (time: number) => {
      const tw = typewriterRef.current;
      const sentence = headlines[tw.idx];
      const TYPING_SPEED = 130;
      const DELETING_SPEED = 55;
      const PAUSE_AFTER_TYPING = 2500;
      const PAUSE_BEFORE_TYPING = 500;

      if (tw.paused) {
        if (time < tw.pauseUntil) { animId = requestAnimationFrame(animate); return; }
        tw.paused = false;
      }

      if (time - tw.lastTime < (tw.deleting ? DELETING_SPEED : TYPING_SPEED)) {
        animId = requestAnimationFrame(animate);
        return;
      }
      tw.lastTime = time;

      if (!tw.deleting) {
        tw.charPos++;
        setDisplayText(sentence.slice(0, tw.charPos));
        if (tw.charPos >= sentence.length) {
          tw.paused = true;
          tw.pauseUntil = time + PAUSE_AFTER_TYPING;
          tw.deleting = true;
        }
      } else {
        tw.charPos--;
        setDisplayText(sentence.slice(0, tw.charPos));
        if (tw.charPos <= 0) {
          tw.deleting = false;
          tw.idx = (tw.idx + 1) % headlines.length;
          tw.paused = true;
          tw.pauseUntil = time + PAUSE_BEFORE_TYPING;
        }
      }
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleScroll = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const features = [
    { icon: <Users className="h-6 w-6" />, title: "Topluluk Forumu", desc: "Benzer yollardan geçen ailelerle tanışın, deneyimlerinizi paylaşın ve güçlü bir destek ağı oluşturun.", color: "from-teal-500 to-emerald-500" },
    { icon: <MessageCircle className="h-6 w-6" />, title: "Birebir Mesajlaşma", desc: "Öğretmenler ve uzmanlarla doğrudan, güvenli ve şifreli mesajlaşma ile sorularınıza anında yanıt bulun.", color: "from-indigo-500 to-purple-500" },
    { icon: <BookOpen className="h-6 w-6" />, title: "Bilgi Kütüphanesi", desc: "Uzmanlar tarafından hazırlanan makaleler, rehberler ve eğitim materyalleriyle bilgi birikimini artırın.", color: "from-emerald-500 to-green-500" },
    { icon: <GraduationCap className="h-6 w-6" />, title: "Uzman Rehberliği", desc: "Doğrulanmış özel eğitim uzmanlarının profillerini inceleyin ve profesyonel rehberlik alın.", color: "from-amber-500 to-yellow-500" },
    { icon: <Lock className="h-6 w-6" />, title: "Güvenli Ortam", desc: "Anonim paylaşım seçeneği ve moderasyon sistemiyle güvenli, özel bir topluluk deneyimi yaşayın.", color: "from-rose-500 to-pink-500" },
    { icon: <Smartphone className="h-6 w-6" />, title: "Her Cihazda", desc: "PWA desteğiyle uygulamayı telefonunuza kurun. Masaüstünde, tablette, her yerde erişin.", color: "from-sky-500 to-blue-500" },
  ];

  return (
    <div className="min-h-screen bg-[#0B1120] text-white overflow-x-hidden">

      {/* ═══ NAVBAR ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0B1120]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden ring-1 ring-white/10">
              <Image src="/logo.png" alt="Ruhefza" fill className="object-cover" />
            </div>
            <span className="text-lg font-bold tracking-tight">Ruhefza</span>
          </Link>
          <div className="hidden lg:flex items-center gap-8">
            {[
              { label: "Özellikler", id: "features" },
              { label: "Nasıl Çalışır", id: "how-it-works" },
              { label: "Topluluk", id: "community" },
            ].map((item) => (
              <a key={item.id} href={`#${item.id}`} onClick={(e) => handleScroll(e, item.id)}
                className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">
                {item.label}
              </a>
            ))}
            <Link href="/knowledge" className="text-sm text-gray-400 hover:text-white transition-colors">
              Kütüphane
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/feed" className="px-5 py-2.5 text-sm font-semibold bg-teal-600 rounded-xl hover:bg-teal-500 transition-all shadow-lg shadow-teal-600/20">
                Uygulamaya Git
              </Link>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors hidden sm:block">
                  Giriş Yap
                </Link>
                <Link href="/signup" className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-teal-500 to-emerald-500 rounded-xl hover:from-teal-400 hover:to-emerald-400 transition-all shadow-lg shadow-teal-600/25">
                  Ücretsiz Başla
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section ref={containerRef} className="relative min-h-screen flex flex-col items-center justify-center pt-16 overflow-hidden">
        {/* Mouse-following glow */}
        <div ref={glowRef} className="absolute w-[600px] h-[600px] rounded-full bg-teal-500/[0.07] blur-[120px] transition-all duration-700 ease-out pointer-events-none opacity-0" />

        {/* Static ambient glows */}
        <div className="absolute top-32 left-1/4 w-[500px] h-[500px] bg-teal-600/[0.06] rounded-full blur-[150px]" />
        <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-indigo-600/[0.04] rounded-full blur-[120px]" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,black_40%,transparent_100%)]" />

        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium text-teal-300 border border-teal-500/20 bg-teal-500/[0.08] backdrop-blur-sm mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Türkiye&apos;nin En Büyük Özel Eğitim Topluluğu
          </div>

          {/* Headline with typewriter — full sentence */}
          <h1 className="text-4xl sm:text-6xl lg:text-8xl font-black tracking-tight leading-[1.05] mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 min-h-[1.2em]">
            {(() => {
              const spaceIdx = displayText.indexOf(" ");
              if (spaceIdx === -1) {
                return <span>{displayText}</span>;
              }
              const firstWord = displayText.slice(0, spaceIdx + 1);
              const rest = displayText.slice(spaceIdx + 1);
              return (
                <>
                  <span>{firstWord}</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-300">
                    {rest}
                  </span>
                </>
              );
            })()}
            <span className="text-teal-400 animate-blink-cursor">|</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            Uzmanlar, aileler ve öğretmenler bir arada.
            <br className="hidden sm:block" />
            Çocuğunuzun gelişim yolculuğunda yanınızdayız.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <Link href={user ? "/feed" : "/signup"}
              className="group w-full sm:w-auto px-8 py-4 text-base font-semibold bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl hover:from-teal-400 hover:to-emerald-400 transition-all shadow-2xl shadow-teal-500/25 hover:shadow-teal-500/40 flex items-center justify-center gap-2 hover:-translate-y-0.5">
              {user ? "Akışa Dön" : "Topluluğa Katıl"}
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#features" onClick={(e) => handleScroll(e, "features")}
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold border border-white/10 rounded-2xl hover:bg-white/5 transition-all flex items-center justify-center gap-2 cursor-pointer">
              <Play className="h-4 w-4" /> Keşfet
            </a>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 text-gray-500 animate-in fade-in duration-1000 delay-500">
            <div className="flex -space-x-2.5">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0B1120] bg-gray-800 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 77}`} alt="" />
                </div>
              ))}
            </div>
            <span className="text-sm">
              <span className="font-semibold text-white">1,247+</span> kişi bu ay katıldı
            </span>
          </div>
        </div>

        {/* ─── SHOWCASE CARDS ─── */}
        <div className="relative mt-16 sm:mt-20 w-full max-w-6xl mx-auto px-4 pb-8">
          {/* Desktop: 3 cards side by side */}
          <div className="hidden md:flex items-start justify-center gap-6 lg:gap-10">
            {/* Left — Bilgi Bankası */}
            <div className="w-[280px] mt-12 bg-white/[0.97] rounded-2xl p-5 shadow-2xl shadow-black/30 border border-white/60 transform rotate-[-4deg] hover:rotate-[-1deg] hover:scale-105 hover:-translate-y-2 transition-all duration-500 card-hover-shine flex-shrink-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center text-emerald-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-stone-800">Otizm Rehberi</p>
                  <p className="text-xs text-stone-400">Dr. Elif Yıldız</p>
                </div>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed mb-3">
                İletişim stratejileri ve günlük rutinlerin oluşturulması hakkında kapsamlı rehber...
              </p>
              <div className="flex gap-2">
                <span className="text-[10px] px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full font-medium">Otizm</span>
                <span className="text-[10px] px-2.5 py-1 bg-stone-100 text-stone-500 rounded-full font-medium">5 dk okuma</span>
              </div>
            </div>

            {/* Center — Topluluk Gönderisi */}
            <div className="w-[400px] lg:w-[440px] bg-white rounded-2xl shadow-2xl shadow-black/40 border border-white/80 overflow-hidden flex-shrink-0 hover:-translate-y-2 transition-all duration-500">
              <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" alt="" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-800 text-sm">Zeynep K.</p>
                    <p className="text-xs text-stone-400">2 saat önce</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full font-medium">
                  <CheckCircle className="h-3 w-3" /> Doğrulanmış
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-base mb-2 text-stone-900">Bugün harika bir gelişme oldu! ✨</h3>
                <p className="text-stone-600 leading-relaxed text-sm">
                  Oğlum ilk kez göz teması kurarak &quot;anne&quot; dedi. Bu anı o kadar uzun zamandır bekliyorduk ki... Sabrın ve eğitimin gücüne inanın! ❤️
                </p>
                <div className="mt-3 h-16 w-full bg-gradient-to-br from-teal-50 via-emerald-50 to-amber-50 rounded-xl flex items-center justify-center border border-teal-100/50">
                  <Heart className="h-6 w-6 text-rose-400 fill-rose-400 animate-pulse mr-2" />
                  <span className="text-sm font-medium text-stone-500">Mutluluk anı 🌟</span>
                </div>
              </div>
              <div className="px-5 py-3 bg-stone-50/80 border-t border-stone-100 flex items-center gap-4">
                <button className="flex items-center gap-1.5 text-rose-500 text-sm font-medium bg-rose-50 px-3 py-1.5 rounded-full">
                  <Heart className="h-4 w-4 fill-current" /> 128
                </button>
                <button className="flex items-center gap-1.5 text-stone-500 text-sm font-medium px-3 py-1.5 rounded-full">
                  <MessageCircle className="h-4 w-4" /> 42
                </button>
              </div>
            </div>

            {/* Right — Uzman Sohbeti */}
            <div className="w-[280px] mt-16 bg-white/[0.97] rounded-2xl p-5 shadow-2xl shadow-black/30 border border-white/60 transform rotate-[4deg] hover:rotate-[1deg] hover:scale-105 hover:-translate-y-2 transition-all duration-500 card-hover-shine flex-shrink-0">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-stone-100">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-purple-50 overflow-hidden ring-2 ring-purple-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-stone-800">Ayşe Yılmaz</p>
                  <p className="text-[11px] text-emerald-600 font-medium">Özel Eğitim Uzmanı</p>
                </div>
              </div>
              <div className="space-y-2.5">
                <div className="bg-stone-50 rounded-2xl rounded-tl-sm p-3 text-xs text-stone-600 w-[92%]">
                  Ali&apos;nin son durumunu değerlendirmek için...
                </div>
                <div className="bg-teal-500 text-white rounded-2xl rounded-tr-sm p-3 text-xs ml-auto w-[85%] shadow-md shadow-teal-500/20">
                  Teşekkürler hocam, yarın uygun saatiniz var mı?
                </div>
              </div>
            </div>
          </div>

          {/* Mobile: single card */}
          <div className="md:hidden">
            <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">
              <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full border-2 border-white overflow-hidden bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" alt="" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-800 text-sm">Zeynep K.</p>
                    <p className="text-xs text-stone-400">2 saat önce</p>
                  </div>
                </div>
                <div className="text-xs text-teal-600 bg-teal-50 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Doğrulanmış
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-base mb-1 text-stone-900">Bugün harika bir gelişme oldu! ✨</h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Oğlum ilk kez göz teması kurarak &quot;anne&quot; dedi. Sabrın ve eğitimin gücüne inanın! ❤️
                </p>
              </div>
              <div className="px-4 py-2.5 bg-stone-50/80 border-t border-stone-100 flex items-center gap-3">
                <span className="flex items-center gap-1 text-rose-500 text-sm font-medium bg-rose-50 px-3 py-1 rounded-full">
                  <Heart className="h-3.5 w-3.5 fill-current" /> 128
                </span>
                <span className="flex items-center gap-1 text-stone-400 text-sm">
                  <MessageCircle className="h-3.5 w-3.5" /> 42
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="pb-8 animate-bounce">
          <ChevronDown className="h-5 w-5 text-teal-500/50" />
        </div>
      </section>

      {/* ═══ MARQUEE TICKER ═══ */}
      <div className="border-y border-white/[0.04] bg-white/[0.01] py-5 overflow-hidden">
        <div className="flex animate-marquee gap-12 whitespace-nowrap">
          {[...Array(2)].map((_, setIdx) => (
            <React.Fragment key={setIdx}>
              {["1,247+ Aktif Üye", "52 Onaylı Uzman", "3,800+ Paylaşım", "4.9/5 Memnuniyet", "7/24 Destek", "Ücretsiz Platform"].map((item, i) => (
                <span key={`${setIdx}-${i}`} className="text-sm text-gray-500 flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500/60" />
                  {item}
                </span>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ═══ FEATURES — Interactive Tabs ═══ */}
      <section id="features" className="py-20 sm:py-32 relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-600/[0.03] rounded-full blur-[150px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <SectionHeader
            badge="Platform Özellikleri"
            badgeIcon={<Sparkles className="h-4 w-4" />}
            title={<>İhtiyacınız Olan <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">Her Şey</span></>}
            subtitle="Özel eğitim yolculuğunuzu desteklemek için tasarlanmış güçlü araçlar."
          />

          {/* Desktop: Interactive feature tabs */}
          <div className="hidden lg:grid grid-cols-[1fr_1.4fr] gap-10 items-start mt-16">
            {/* Feature list */}
            <div className="flex flex-col gap-1.5">
              {features.map((f, i) => (
                <button key={i} onClick={() => setActiveFeature(i)}
                  className={`group flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-300 relative ${activeFeature === i
                    ? "bg-white/[0.06] border border-white/[0.08]"
                    : "hover:bg-white/[0.03] border border-transparent"
                    }`}>
                  {activeFeature === i && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-teal-400 to-emerald-400 rounded-full" />
                  )}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${activeFeature === i
                    ? `bg-gradient-to-br ${f.color} text-white shadow-lg`
                    : "bg-white/[0.05] text-gray-500 group-hover:text-gray-300"
                    }`}>
                    {f.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className={`font-semibold text-[15px] transition-colors ${activeFeature === i ? "text-white" : "text-gray-400 group-hover:text-gray-200"}`}>
                      {f.title}
                    </h3>
                    <p className={`text-xs leading-relaxed mt-0.5 transition-all duration-300 overflow-hidden ${activeFeature === i ? "text-gray-500 max-h-12 opacity-100" : "max-h-0 opacity-0"}`}>
                      {f.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Feature preview — mini UI mockups */}
            <div className="sticky top-24 bg-gradient-to-br from-white/[0.04] to-white/[0.01] rounded-3xl border border-white/[0.07] min-h-[480px] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/[0.03] to-transparent" />

              <div className="relative z-10 p-6 h-full">
                {/* Preview Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${features[activeFeature].color} flex items-center justify-center text-white shadow-lg [&>svg]:h-4 [&>svg]:w-4`}>
                      {features[activeFeature].icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{features[activeFeature].title}</h3>
                      <p className="text-xs text-gray-500">Önizleme</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                  </div>
                </div>

                {/* Mini UI Mockup Content */}
                <div className="bg-[#0B1120]/60 rounded-2xl border border-white/[0.05] p-5 min-h-[360px] transition-all duration-500">
                  {activeFeature === 0 && (
                    /* Topluluk Forumu — Mini Feed */
                    <div className="space-y-3 animate-in fade-in duration-500">
                      {[
                        { name: "Zeynep K.", time: "2 dk", text: "Bugün harika bir gelişme oldu! Oğlum ilk kez göz teması kurarak \"anne\" dedi. 🎉", likes: 128, avatar: "Sarah" },
                        { name: "Ayşe T.", time: "15 dk", text: "Down sendromlu kızımız için evde uygulayabileceğimiz egzersizler hakkında önerileriniz var mı?", likes: 45, avatar: "Jane" },
                        { name: "Dr. Elif Y.", time: "1 sa", text: "Yeni makale: Otizmde erken müdahalenin önemi ve aile eğitim programları 📚", likes: 89, avatar: "Felix" },
                      ].map((post, i) => (
                        <div key={i} className="bg-white/[0.04] rounded-xl p-3.5 border border-white/[0.04] hover:border-teal-500/20 transition-colors">
                          <div className="flex items-center gap-2.5 mb-2">
                            <div className="w-7 h-7 rounded-full bg-white/[0.08] overflow-hidden">
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${post.avatar}`} alt="" />
                            </div>
                            <span className="text-xs font-semibold text-white">{post.name}</span>
                            <span className="text-[10px] text-gray-600">{post.time}</span>
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed mb-2">{post.text}</p>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-rose-400 flex items-center gap-1"><Heart className="h-3 w-3 fill-current" />{post.likes}</span>
                            <span className="text-[10px] text-gray-600 flex items-center gap-1"><MessageCircle className="h-3 w-3" />Yanıtla</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeFeature === 1 && (
                    /* Birebir Mesajlaşma — Chat UI */
                    <div className="flex flex-col h-[340px] animate-in fade-in duration-500">
                      <div className="flex items-center gap-3 pb-3 border-b border-white/[0.05] mb-4">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-white/[0.08] overflow-hidden">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="" />
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0B1120]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">Ayşe Yılmaz</p>
                          <p className="text-[10px] text-emerald-400">Çevrimiçi</p>
                        </div>
                      </div>
                      <div className="flex-1 space-y-3 overflow-hidden">
                        <div className="bg-white/[0.06] rounded-2xl rounded-tl-sm p-3 text-xs text-gray-300 max-w-[80%]">
                          Merhaba Yasin Bey, Ali&apos;nin son değerlendirmesini inceledim. Büyük ilerleme kaydetmiş! 🎉
                        </div>
                        <div className="bg-white/[0.06] rounded-2xl rounded-tl-sm p-3 text-xs text-gray-300 max-w-[80%]">
                          Göz teması süresinde %40 artış gözlemledim. Yeni egzersiz planını hazırladım.
                        </div>
                        <div className="bg-teal-600 rounded-2xl rounded-tr-sm p-3 text-xs text-white max-w-[75%] ml-auto">
                          Harika haber! Planı görmek isteriz 😊
                        </div>
                        <div className="bg-teal-600 rounded-2xl rounded-tr-sm p-3 text-xs text-white max-w-[75%] ml-auto">
                          Yarın uygun saatiniz var mı görüşmek için?
                        </div>
                        <div className="bg-white/[0.06] rounded-2xl rounded-tl-sm p-3 text-xs text-gray-300 max-w-[80%]">
                          Tabii ki! Yarın 14:00 uygun olur 📋
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <div className="flex-1 bg-white/[0.04] rounded-xl px-3 py-2.5 text-xs text-gray-600 border border-white/[0.05]">Mesajınızı yazın...</div>
                        <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center text-white"><ArrowRight className="h-4 w-4" /></div>
                      </div>
                    </div>
                  )}

                  {activeFeature === 2 && (
                    /* Bilgi Kütüphanesi — Article Cards */
                    <div className="space-y-3 animate-in fade-in duration-500">
                      <div className="flex gap-2 mb-4">
                        <span className="text-[10px] px-2.5 py-1 bg-teal-500/20 text-teal-400 rounded-full font-medium">Tümü</span>
                        <span className="text-[10px] px-2.5 py-1 bg-white/[0.05] text-gray-500 rounded-full">Otizm</span>
                        <span className="text-[10px] px-2.5 py-1 bg-white/[0.05] text-gray-500 rounded-full">Down Sendromu</span>
                        <span className="text-[10px] px-2.5 py-1 bg-white/[0.05] text-gray-500 rounded-full">Disleksi</span>
                      </div>
                      {[
                        { title: "Otizmde Erken Müdahale Rehberi", author: "Dr. Elif Yıldız", tag: "Otizm", reads: "1.2k", color: "bg-emerald-500/20 text-emerald-400" },
                        { title: "Evde Uygulanabilir Konuşma Egzersizleri", author: "Uzm. Ayşe Yılmaz", tag: "Terapi", reads: "890", color: "bg-purple-500/20 text-purple-400" },
                        { title: "Aile-Okul İşbirliği Stratejileri", author: "Prof. Mehmet A.", tag: "Eğitim", reads: "650", color: "bg-amber-500/20 text-amber-400" },
                      ].map((article, i) => (
                        <div key={i} className="flex items-start gap-3 bg-white/[0.04] rounded-xl p-3.5 border border-white/[0.04] hover:border-teal-500/20 transition-colors group cursor-pointer">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/10 flex items-center justify-center flex-shrink-0">
                            <BookOpen className="h-5 w-5 text-teal-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-semibold text-white mb-1 group-hover:text-teal-300 transition-colors">{article.title}</h4>
                            <p className="text-[10px] text-gray-500">{article.author}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full ${article.color} font-medium`}>{article.tag}</span>
                              <span className="text-[10px] text-gray-600">{article.reads} okuma</span>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-600 group-hover:text-teal-400 transition-colors mt-1" />
                        </div>
                      ))}
                    </div>
                  )}

                  {activeFeature === 3 && (
                    /* Uzman Rehberliği — Expert Profiles */
                    <div className="space-y-3 animate-in fade-in duration-500">
                      {[
                        { name: "Dr. Ayşe Yılmaz", title: "Çocuk Psikoloğu", rating: "4.9", reviews: 120, status: "Çevrimiçi", seed: "Felix", specialties: ["Otizm", "DEHB"] },
                        { name: "Uzm. Elif Demir", title: "Dil ve Konuşma Terapisti", rating: "4.8", reviews: 89, status: "Meşgul", seed: "expert2", specialties: ["Konuşma", "Disleksi"] },
                        { name: "Prof. Mehmet Arslan", title: "Özel Eğitim Uzmanı", rating: "4.9", reviews: 156, status: "Çevrimiçi", seed: "doc1", specialties: ["Down", "Eğitim"] },
                      ].map((expert, i) => (
                        <div key={i} className="flex items-center gap-3 bg-white/[0.04] rounded-xl p-3.5 border border-white/[0.04] hover:border-teal-500/20 transition-colors group cursor-pointer">
                          <div className="relative flex-shrink-0">
                            <div className="w-11 h-11 rounded-full bg-white/[0.08] overflow-hidden ring-2 ring-white/[0.06]">
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${expert.seed}`} alt="" />
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0B1120] ${expert.status === "Çevrimiçi" ? "bg-emerald-400" : "bg-amber-400"}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-semibold text-white">{expert.name}</h4>
                              <CheckCircle className="h-3 w-3 text-teal-400" />
                            </div>
                            <p className="text-[10px] text-gray-500">{expert.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {expert.specialties.map((s, si) => (
                                <span key={si} className="text-[9px] px-1.5 py-0.5 bg-white/[0.05] text-gray-400 rounded">{s}</span>
                              ))}
                              <span className="text-[10px] text-amber-400 flex items-center gap-0.5 ml-auto"><Star className="h-3 w-3 fill-current" />{expert.rating}</span>
                            </div>
                          </div>
                          <button className="px-3 py-1.5 text-[10px] font-semibold bg-teal-500/20 text-teal-400 rounded-lg hover:bg-teal-500/30 transition-colors">Profil</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeFeature === 4 && (
                    /* Güvenli Ortam — Security Dashboard */
                    <div className="animate-in fade-in duration-500">
                      <div className="flex items-center justify-center mb-6 mt-4">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center border-2 border-emerald-500/30">
                          <Shield className="h-10 w-10 text-emerald-400" />
                        </div>
                      </div>
                      <h4 className="text-center text-sm font-bold text-white mb-6">Güvenlik Durumu: Aktif ✓</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "Şifreli Mesajlaşma", status: "Aktif", icon: <Lock className="h-4 w-4" /> },
                          { label: "KVKK Uyumlu", status: "Onaylı", icon: <Shield className="h-4 w-4" /> },
                          { label: "Anonim Paylaşım", status: "Aktif", icon: <Users className="h-4 w-4" /> },
                          { label: "Moderasyon", status: "7/24", icon: <CheckCircle className="h-4 w-4" /> },
                        ].map((item, i) => (
                          <div key={i} className="bg-white/[0.04] rounded-xl p-3.5 border border-white/[0.04] text-center">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mx-auto mb-2">
                              {item.icon}
                            </div>
                            <p className="text-[11px] font-semibold text-white mb-0.5">{item.label}</p>
                            <p className="text-[10px] text-emerald-400 font-medium">{item.status}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeFeature === 5 && (
                    /* Her Cihazda — Device Frames */
                    <div className="flex items-center justify-center h-[340px] animate-in fade-in duration-500">
                      <div className="flex items-end gap-5">
                        {/* Phone */}
                        <div className="w-[120px] bg-white/[0.06] rounded-2xl border border-white/[0.08] p-2 shadow-xl">
                          <div className="w-full h-3 flex items-center justify-center mb-1.5">
                            <div className="w-10 h-1.5 rounded-full bg-white/[0.1]" />
                          </div>
                          <div className="bg-[#0B1120] rounded-lg p-2 space-y-1.5">
                            <div className="h-2 w-3/4 bg-teal-500/30 rounded" />
                            <div className="h-2 w-full bg-white/[0.05] rounded" />
                            <div className="h-2 w-2/3 bg-white/[0.05] rounded" />
                            <div className="h-8 bg-white/[0.04] rounded mt-2 flex items-center justify-center">
                              <Heart className="h-3 w-3 text-rose-400/50" />
                            </div>
                            <div className="h-2 w-full bg-white/[0.05] rounded" />
                            <div className="h-2 w-1/2 bg-white/[0.05] rounded" />
                          </div>
                          <p className="text-[8px] text-center text-gray-600 mt-1.5">Mobil</p>
                        </div>
                        {/* Tablet */}
                        <div className="w-[180px] bg-white/[0.06] rounded-2xl border border-white/[0.08] p-2.5 shadow-xl">
                          <div className="w-full h-3 flex items-center justify-center mb-2">
                            <div className="w-3 h-3 rounded-full bg-white/[0.08]" />
                          </div>
                          <div className="bg-[#0B1120] rounded-lg p-3 space-y-2">
                            <div className="h-2 w-1/2 bg-teal-500/30 rounded" />
                            <div className="grid grid-cols-2 gap-1.5">
                              <div className="h-10 bg-white/[0.04] rounded" />
                              <div className="h-10 bg-white/[0.04] rounded" />
                            </div>
                            <div className="h-2 w-full bg-white/[0.05] rounded" />
                            <div className="h-2 w-3/4 bg-white/[0.05] rounded" />
                          </div>
                          <p className="text-[8px] text-center text-gray-600 mt-1.5">Tablet</p>
                        </div>
                        {/* Desktop */}
                        <div className="w-[220px] bg-white/[0.06] rounded-xl border border-white/[0.08] p-2 shadow-xl">
                          <div className="flex items-center gap-1 mb-1.5 px-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500/40" />
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/40" />
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500/40" />
                          </div>
                          <div className="bg-[#0B1120] rounded-lg p-3 space-y-2">
                            <div className="flex gap-2">
                              <div className="w-12 space-y-1.5">
                                <div className="h-2 bg-teal-500/30 rounded" />
                                <div className="h-2 bg-white/[0.05] rounded" />
                                <div className="h-2 bg-white/[0.05] rounded" />
                              </div>
                              <div className="flex-1 space-y-1.5">
                                <div className="h-8 bg-white/[0.04] rounded" />
                                <div className="h-8 bg-white/[0.04] rounded" />
                              </div>
                            </div>
                          </div>
                          <p className="text-[8px] text-center text-gray-600 mt-1.5">Masaüstü</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tab indicators */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  {features.map((_, i) => (
                    <button key={i} onClick={() => setActiveFeature(i)}
                      className={`h-1 rounded-full transition-all duration-300 ${i === activeFeature ? "w-6 bg-teal-400" : "w-1.5 bg-white/15 hover:bg-white/30"}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile: Grid */}
          <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12">
            {features.map((f, i) => (
              <FeatureCard key={i} {...f} delay={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS — Timeline ═══ */}
      <section id="how-it-works" className="py-20 sm:py-32 relative">
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/[0.03] rounded-full blur-[150px]" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <SectionHeader
            badge="Kolay Başlangıç"
            badgeIcon={<Zap className="h-4 w-4" />}
            title="3 Adımda Başlayın"
            subtitle="Birkaç dakika içinde topluluğa katılın."
          />

          <div className="relative mt-16">
            {/* Vertical line */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-teal-500/50 via-teal-500/20 to-transparent hidden sm:block" />

            <div className="flex flex-col gap-12 sm:gap-16">
              {[
                { step: 1, title: "Hesabınızı Oluşturun", desc: "Ebeveyn, öğretmen veya uzman olarak ücretsiz kayıt olun. 30 saniyede tamamlayın.", icon: <Users className="h-5 w-5" /> },
                { step: 2, title: "Topluluğa Katılın", desc: "Deneyimlerinizi paylaşın, sorular sorun ve diğer ailelerin hikayelerinden ilham alın.", icon: <Heart className="h-5 w-5" /> },
                { step: 3, title: "Uzmanlarla Bağlantı Kurun", desc: "Doğrulanmış uzmanlardan profesyonel rehberlik ve destek alın.", icon: <Award className="h-5 w-5" /> },
              ].map((item) => (
                <TimelineStep key={item.step} {...item} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section className="py-16 sm:py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-600/[0.06] via-transparent to-emerald-600/[0.06]" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <AnimatedStat end={1247} suffix="+" label="Aktif Üye" />
            <AnimatedStat end={52} label="Onaylı Uzman" />
            <AnimatedStat end={3800} suffix="+" label="Paylaşım" />
            <AnimatedStat end={49} suffix="/5" label="Memnuniyet" isDecimal />
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section id="community" className="py-20 sm:py-32 relative">
        <div className="absolute top-0 left-1/3 w-[400px] h-[400px] bg-teal-600/[0.03] rounded-full blur-[120px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <SectionHeader
            badge="Topluluk Hikayeleri"
            badgeIcon={<Heart className="h-4 w-4" />}
            title="Aileler Ne Diyor?"
            subtitle="Topluluğumuzdan gerçek deneyimler ve geri bildirimler."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <TestimonialCard quote="Oğlumun otizm teşhisi konduğunda çok yalnız hissediyorduk. Ruhefza sayesinde aynı yollardan geçen ailelerle tanıştık ve umudumuz arttı." name="Fatma Y." role="Ebeveyn" seed="mom1" delay={0} />
            <TestimonialCard quote="Uzman olarak bilgilerimi paylaşabildiğim ve ailelere doğrudan ulaşabildiğim bu platform harika. Gerçek bir değişim yaratıyoruz." name="Dr. Mehmet A." role="Özel Eğitim Uzmanı" seed="doc1" delay={1} />
            <TestimonialCard quote="Bilgi Kütüphanesi'ndeki makaleler çok faydalı. Çocuğumuzun gelişim sürecinde hangi adımları atmalıyız konusunda çok aydınlandık." name="Ahmet ve Elif K." role="Ebeveyn" seed="family1" delay={2} />
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="py-20 sm:py-32 relative">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            badge="Yardım Merkezi"
            badgeIcon={<MessageCircle className="h-4 w-4" />}
            title="Sıkça Sorulan Sorular"
            subtitle="Merak ettiğiniz soruların cevapları."
          />
          <div className="flex flex-col gap-3 mt-12">
            {[
              { q: "Ruhefza tamamen ücretsiz mi?", a: "Evet! Topluluk forumu, bilgi kütüphanesi ve mesajlaşma gibi tüm ana özellikler herkes için ücretsiz olarak sunulmaktadır." },
              { q: "Hangi uzmanlar platformda aktif?", a: "Çocuk psikologları, dil ve konuşma terapistleri, özel eğitim öğretmenleri ve fizyoterapistler gibi alanında uzman profesyoneller aktif olarak yer almaktadır." },
              { q: "Bilgilerim güvende mi?", a: "Kesinlikle. Tüm verileriniz şifrelenerek saklanır. KVKK uyumlu altyapımız ile kişisel bilgileriniz en yüksek güvenlik standartlarında korunmaktadır." },
              { q: "Nasıl uzman olarak katılabilirim?", a: "Uzman başvuru formunu doldurup belgelerinizi yükleyerek başvurabilirsiniz. Ekibimiz başvurunuzu 48 saat içinde değerlendirir." },
              { q: "Mobil uygulama var mı?", a: "Ruhefza bir PWA olarak çalışır. Telefonunuzun tarayıcısından ana ekrana ekleyerek uygulama gibi kullanabilirsiniz." },
            ].map((faq, i) => (
              <FaqItem key={i} question={faq.q} answer={faq.a} isOpen={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-20 sm:py-32">
        <div className="max-w-4xl mx-auto px-4">
          <FinalCTA user={user} />
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/[0.05] text-gray-500 pt-14 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 sm:gap-12 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="relative w-9 h-9 rounded-xl overflow-hidden ring-1 ring-white/10">
                  <Image src="/logo.png" alt="Ruhefza" fill className="object-cover" />
                </div>
                <span className="text-lg font-bold text-white">Ruhefza</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Özel eğitim alanında aileler, öğretmenler ve uzmanları bir araya getiren topluluk platformu.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Platform</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/feed" className="hover:text-white transition-colors">Topluluk</Link></li>
                <li><Link href="/knowledge" className="hover:text-white transition-colors">Bilgi Kütüphanesi</Link></li>
                <li><Link href="/experts" className="hover:text-white transition-colors">Uzmanlar</Link></li>
                <li><Link href="/messages" className="hover:text-white transition-colors">Mesajlar</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Destek</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Hakkımızda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Gizlilik Politikası</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Kullanım Şartları</a></li>
                <li><a href="#" className="hover:text-white transition-colors">İletişim</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">İletişim</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-teal-500" /><a href="mailto:info@ruhefza.com" className="hover:text-white transition-colors">info@ruhefza.com</a></li>
                <li className="flex items-center gap-2"><Globe className="h-4 w-4 text-teal-500" /><a href="#" className="hover:text-white transition-colors">ruhefza.com</a></li>
              </ul>
              <div className="flex gap-3 mt-5">
                <a href="#" className="w-9 h-9 bg-white/[0.05] hover:bg-teal-600 rounded-lg flex items-center justify-center transition-colors hover:text-white"><Globe className="h-4 w-4" /></a>
                <a href="#" className="w-9 h-9 bg-white/[0.05] hover:bg-teal-600 rounded-lg flex items-center justify-center transition-colors hover:text-white"><Mail className="h-4 w-4" /></a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/[0.05] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-600">© 2026 Ruhefza. Tüm hakları saklıdır.</p>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Tüm sistemler aktif
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════ */

function SectionHeader({ badge, badgeIcon, title, subtitle }: {
  badge: string; badgeIcon: React.ReactNode; title: React.ReactNode; subtitle: string;
}) {
  const ref = useReveal();
  return (
    <div ref={ref} className="reveal text-center mb-10 sm:mb-16 max-w-2xl mx-auto">
      <div className="inline-flex items-center gap-2 text-sm font-semibold text-teal-400 mb-4">
        {badgeIcon} {badge}
      </div>
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-5 tracking-tight">
        {title}
      </h2>
      <p className="text-base sm:text-lg text-gray-400 leading-relaxed px-2">
        {subtitle}
      </p>
    </div>
  );
}

function FeatureCard({ icon, title, desc, color, delay }: {
  icon: React.ReactNode; title: string; desc: string; color: string; delay: number;
}) {
  const ref = useReveal();
  return (
    <div ref={ref} className={`reveal reveal-delay-${delay + 1} bg-white/[0.04] hover:bg-white/[0.07] p-6 rounded-2xl border border-white/[0.06] hover:border-teal-500/20 transition-all duration-500 group cursor-default`}>
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-lg`}>
        {icon}
      </div>
      <h3 className="text-base font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function TimelineStep({ step, title, desc, icon }: {
  step: number; title: string; desc: string; icon: React.ReactNode;
}) {
  const ref = useReveal();
  return (
    <div ref={ref} className="reveal flex items-start gap-6 sm:gap-8 group">
      <div className="relative flex-shrink-0">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-teal-400 group-hover:bg-teal-500/10 group-hover:border-teal-500/30 group-hover:scale-110 transition-all duration-500">
          {icon}
        </div>
        <div className="absolute -top-2 -right-2 w-7 h-7 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg shadow-teal-600/30">
          {step}
        </div>
      </div>
      <div className="pt-3">
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-teal-300 transition-colors">{title}</h3>
        <p className="text-gray-400 leading-relaxed max-w-md">{desc}</p>
      </div>
    </div>
  );
}

function AnimatedStat({ end, suffix = "", label, isDecimal }: {
  end: number; suffix?: string; label: string; isDecimal?: boolean;
}) {
  const { count, ref } = useCounter(end);
  const display = isDecimal ? (count / 10).toFixed(1) : count.toLocaleString("tr-TR");
  return (
    <div ref={ref} className="text-center group">
      <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-2 tracking-tight group-hover:scale-110 transition-transform duration-500">
        {display}{suffix}
      </div>
      <div className="text-sm text-gray-500 font-medium">{label}</div>
    </div>
  );
}

function TestimonialCard({ quote, name, role, seed, delay }: {
  quote: string; name: string; role: string; seed: string; delay: number;
}) {
  const ref = useReveal();
  return (
    <div ref={ref} className={`reveal reveal-delay-${delay + 1} bg-white/[0.04] p-7 rounded-2xl border border-white/[0.06] hover:border-teal-500/20 hover:-translate-y-2 transition-all duration-500 group`}>
      <Quote className="h-8 w-8 text-teal-500/30 mb-4 group-hover:text-teal-500/50 transition-colors" />
      <p className="text-gray-300 leading-relaxed mb-6 text-[15px]">&quot;{quote}&quot;</p>
      <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
        <div className="w-10 h-10 rounded-full bg-white/[0.06] overflow-hidden border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} alt={name} />
        </div>
        <div>
          <p className="font-semibold text-white text-sm">{name}</p>
          <p className="text-xs text-teal-400 font-medium">{role}</p>
        </div>
        <div className="ml-auto flex gap-0.5">
          {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />)}
        </div>
      </div>
    </div>
  );
}

function FaqItem({ question, answer, isOpen, onToggle }: {
  question: string; answer: string; isOpen: boolean; onToggle: () => void;
}) {
  return (
    <div className={`bg-white/[0.03] rounded-xl border transition-all duration-300 overflow-hidden ${isOpen ? "border-teal-500/30 bg-white/[0.05]" : "border-white/[0.06] hover:border-white/[0.12]"}`}>
      <button onClick={onToggle} className="w-full px-6 py-5 flex items-center justify-between text-left">
        <span className={`font-semibold text-sm sm:text-base transition-colors ${isOpen ? "text-teal-400" : "text-white"}`}>{question}</span>
        <ChevronDown className={`h-5 w-5 flex-shrink-0 transition-all duration-300 ${isOpen ? "text-teal-400 rotate-180" : "text-gray-600"}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"}`}>
        <p className="px-6 pb-5 text-sm text-gray-400 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

function FinalCTA({ user }: { user: unknown }) {
  const ref = useReveal();
  return (
    <div ref={ref} className="reveal relative rounded-3xl overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_80%,rgba(255,255,255,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.06),transparent_50%)]" />

      <div className="relative px-6 sm:px-12 lg:px-16 py-14 sm:py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium text-white/90 mb-6">
          <Shield className="h-4 w-4" /> Ücretsiz ve Güvenli
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
          Bu Yolculukta<br />Yanınızdayız
        </h2>
        <p className="text-lg text-teal-100 mb-10 max-w-xl mx-auto leading-relaxed">
          Çocuğunuzun geleceği için atacağınız her adımda size destek olmak için buradayız.
        </p>
        <Link href={user ? "/feed" : "/signup"} className="group inline-flex items-center gap-2 px-8 py-4 bg-white text-teal-700 font-bold rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all text-base">
          {user ? "Ana Sayfaya Git" : "Ücretsiz Kayıt Olun"}
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </Link>
        <p className="text-teal-200/70 text-sm mt-6 flex flex-wrap items-center justify-center gap-4">
          <span>✓ Ücretsiz</span><span>✓ Kredi kartı gerekmez</span><span>✓ 30 saniyede başlayın</span>
        </p>
      </div>
    </div>
  );
}
