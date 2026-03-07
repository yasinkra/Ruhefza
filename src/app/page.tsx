"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Heart, Users, MessageCircle, BookOpen, ArrowRight, Shield, Star,
  CheckCircle, Sparkles, GraduationCap, Lock, Smartphone, Quote,
  ChevronRight, Globe, Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

export default function Home() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setUser(data.user));

    const { data: authListener } = createClient().auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, targetId: string) => {
    e.preventDefault();
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      window.scrollTo({
        top: targetElement.offsetTop - 80,
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ═══════════════════════════════════════════════════════ */}
      {/* NAVBAR */}
      {/* ═══════════════════════════════════════════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-stone-100 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden shadow-md shadow-teal-200/50 ring-1 ring-teal-100">
              <Image src="/logo.png" alt="Ruhefza Logo" fill className="object-cover" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
              Ruhefza
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-8">
            <a href="#features" onClick={(e) => handleScroll(e, 'features')} className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors cursor-pointer">Özellikler</a>
            <a href="#how-it-works" onClick={(e) => handleScroll(e, 'how-it-works')} className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors cursor-pointer">Nasıl Çalışır</a>
            <a href="#community" onClick={(e) => handleScroll(e, 'community')} className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors cursor-pointer">Topluluk</a>
            <Link href="/knowledge" className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors">Kütüphane</Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <Link
                href="/feed"
                className="px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20"
              >
                Uygulamaya Git
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors hidden sm:block"
                >
                  Giriş Yap
                </Link>
                <Link
                  href="/signup"
                  className="px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-all shadow-lg shadow-stone-900/20"
                >
                  Kayıt Ol
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* HERO SECTION */}
      {/* ═══════════════════════════════════════════════════════ */}
      <main className="pt-20 sm:pt-24 lg:pt-32 pb-8 sm:pb-12 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[900px] bg-gradient-to-b from-teal-50/60 via-white to-white -z-10"></div>
        <div className="absolute top-20 right-[-10%] w-[500px] h-[500px] bg-teal-100/30 rounded-full blur-3xl -z-10"></div>
        <div className="absolute top-40 left-[-5%] w-[400px] h-[400px] bg-indigo-100/20 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-50/30 rounded-full blur-3xl -z-10"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Hero Text */}
          <div className="text-center max-w-4xl mx-auto mb-8 sm:mb-16">
            <div className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide text-teal-700 ring-1 ring-teal-200 bg-teal-50 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
              Türkiye&apos;nin Özel Eğitim Topluluğu
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-stone-900 mb-6 sm:mb-8 leading-[1.08] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
              Özel Eğitimde{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-emerald-500 to-teal-600">
                Köprüler Kuruyoruz
              </span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-stone-500 mb-8 sm:mb-10 leading-relaxed max-w-2xl mx-auto px-2 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              Aileler, öğretmenler ve uzmanlar tek bir platformda buluşuyor. Deneyimlerinizi paylaşın, doğrulanmış uzmanlardan rehberlik alın ve eğitim yolculuğunuzda yalnız kalmayın.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <Link
                href={user ? "/feed" : "/signup"}
                className="w-full sm:w-auto px-8 py-4 text-base font-semibold bg-teal-600 text-white rounded-2xl hover:bg-teal-700 transition-all shadow-xl shadow-teal-600/20 hover:shadow-teal-600/30 transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                {user ? "Akışa Dön" : "Hemen Ücretsiz Başla"} <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#features"
                onClick={(e) => handleScroll(e, 'features')}
                className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-stone-700 bg-white border border-stone-200 rounded-2xl hover:bg-stone-50 transition-all hover:border-stone-300 flex items-center justify-center cursor-pointer"
              >
                Daha Fazla Keşfet
              </a>
            </div>

            {/* Social Proof */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-6 text-stone-500 animate-in fade-in duration-1000 delay-500">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-[3px] border-white bg-stone-200 overflow-hidden shadow-sm">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 123}`} alt="User" />
                  </div>
                ))}
                <div className="w-10 h-10 rounded-full border-[3px] border-white bg-teal-50 flex items-center justify-center text-xs font-bold text-teal-700 shadow-sm">+2k</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-0.5 text-amber-400">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                </div>
                <span className="text-sm"><span className="font-semibold text-stone-800">1000+ Aile</span> Tarafından Seviliyor</span>
              </div>
            </div>
          </div>

          {/* ═══════════════ SHOWCASE CARDS (Korunan Alan) ═══════════════ */}
          <div className="relative mt-8 h-[320px] sm:h-[420px] lg:h-[520px] w-full max-w-5xl mx-auto">
            {/* Card 1: Article - Left */}
            <div className="absolute left-0 lg:-left-8 top-24 w-72 bg-white/90 backdrop-blur-sm rounded-2xl p-5 shadow-xl shadow-stone-200/50 border border-stone-100 animate-float-delayed transform rotate-[-5deg] hidden md:block z-10 hover:rotate-[-2deg] transition-transform duration-500">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm shadow-emerald-100">
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
                <span className="text-[10px] px-2.5 py-1 bg-stone-50 text-stone-500 rounded-full font-medium">5 dk okuma</span>
              </div>
            </div>

            {/* Card 2: Chat - Right */}
            <div className="absolute right-0 lg:-right-8 top-36 w-[280px] bg-white/90 backdrop-blur-sm rounded-2xl p-5 shadow-xl shadow-stone-200/50 border border-stone-100 animate-float transform rotate-[4deg] hidden md:block z-10 hover:rotate-[1deg] transition-transform duration-500">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-stone-100">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-purple-50 overflow-hidden ring-2 ring-purple-100">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <p className="font-semibold text-sm text-stone-800">Ayşe Yılmaz</p>
                  <p className="text-[11px] text-emerald-600 font-medium">Özel Eğitim Uzmanı</p>
                </div>
              </div>
              <div className="space-y-2.5">
                <div className="bg-stone-50 rounded-2xl rounded-tl-sm p-3 text-xs text-stone-600 w-[90%]">
                  Merhaba Yasin Bey, Ali&apos;nin son durumunu değerlendirmek için...
                </div>
                <div className="bg-teal-500 text-white rounded-2xl rounded-tr-sm p-3 text-xs ml-auto w-[85%] shadow-md shadow-teal-500/20">
                  Teşekkürler hocam, yarın uygun saatiniz var mı?
                </div>
              </div>
            </div>

            {/* Card 3: Feed - Center (Main) */}
            <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[95%] sm:w-[92%] md:w-[520px] bg-white rounded-2xl shadow-2xl shadow-stone-300/30 border border-stone-200/80 overflow-hidden z-20">
              <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full border-2 border-white shadow-sm overflow-hidden bg-white">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" alt="User" />
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
              <div className="p-4 sm:p-6">
                <h3 className="font-semibold text-base sm:text-lg mb-2 text-stone-900">Bugün harika bir gelişme oldu! ✨</h3>
                <p className="text-stone-600 leading-relaxed text-sm">
                  Oğlum ilk kez göz teması kurarak &quot;anne&quot; dedi. Bu anı o kadar uzun zamandır bekliyorduk ki... Sabrın ve eğitimin gücüne inanın. Asla pes etmeyin dostlar! ❤️
                </p>
                <div className="mt-3 sm:mt-4 h-20 sm:h-28 w-full bg-gradient-to-br from-stone-50 to-stone-100 rounded-xl flex items-center justify-center text-stone-300 border border-stone-100">
                  <span className="text-xs text-stone-400">(Görsel Alanı)</span>
                </div>
              </div>
              <div className="px-6 py-3 bg-stone-50/80 border-t border-stone-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-1.5 text-rose-500 text-sm font-medium bg-rose-50 px-3.5 py-1.5 rounded-full">
                    <Heart className="h-4 w-4 fill-current" /> 128
                  </button>
                  <button className="flex items-center gap-1.5 text-stone-500 text-sm font-medium hover:bg-stone-100 px-3.5 py-1.5 rounded-full transition-colors">
                    <MessageCircle className="h-4 w-4" /> 42
                  </button>
                </div>
                <button className="text-stone-400 hover:text-teal-600 transition-colors">
                  <Shield className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* FEATURES GRID — 6 Özellik */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="features" className="py-16 sm:py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-teal-600 mb-4">
              <Sparkles className="h-4 w-4" /> Platform Özellikleri
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-900 mb-5 tracking-tight">
              İhtiyacınız Olan Her Şey<br className="hidden sm:block" />{" "}Tek Bir Platformda
            </h2>
            <p className="text-base sm:text-lg text-stone-500 leading-relaxed px-2">
              Ruhefza, özel eğitim yolculuğunu kolaylaştırmak ve desteklemek için tasarlanmış kapsamlı bir topluluk platformudur.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Topluluk Forumu"
              description="Benzer yollardan geçen ailelerle tanışın, deneyimlerinizi paylaşın ve birbirinize destek olun."
              gradient="from-teal-50 to-emerald-50"
              iconBg="bg-teal-100 text-teal-600"
            />
            <FeatureCard
              icon={<MessageCircle className="h-6 w-6" />}
              title="Birebir Mesajlaşma"
              description="Öğretmenler ve uzmanlarla doğrudan ve güvenli bir şekilde mesajlaşarak sorularınızı sorun."
              gradient="from-indigo-50 to-purple-50"
              iconBg="bg-indigo-100 text-indigo-600"
            />
            <FeatureCard
              icon={<BookOpen className="h-6 w-6" />}
              title="Bilgi Kütüphanesi"
              description="Uzmanlar tarafından hazırlanmış makaleler, rehberler ve eğitim materyallerine ulaşın."
              gradient="from-emerald-50 to-green-50"
              iconBg="bg-emerald-100 text-emerald-600"
            />
            <FeatureCard
              icon={<GraduationCap className="h-6 w-6" />}
              title="Uzman Rehberliği"
              description="Doğrulanmış özel eğitim uzmanlarının profillerini inceleyin ve rehberlik alın."
              gradient="from-amber-50 to-yellow-50"
              iconBg="bg-amber-100 text-amber-600"
            />
            <FeatureCard
              icon={<Lock className="h-6 w-6" />}
              title="Güvenli Ortam"
              description="Anonim paylaşım seçeneği ve moderasyon sistemiyle güvenli bir topluluk deneyimi yaşayın."
              gradient="from-rose-50 to-pink-50"
              iconBg="bg-rose-100 text-rose-600"
            />
            <FeatureCard
              icon={<Smartphone className="h-6 w-6" />}
              title="Mobil Uyumlu"
              description="Platformu her cihazdan rahatlıkla kullanın. PWA desteğiyle uygulamanızı anında kurun."
              gradient="from-sky-50 to-blue-50"
              iconBg="bg-sky-100 text-sky-600"
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* NASIL ÇALIŞIR? */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-stone-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-teal-100/20 rounded-full blur-3xl -z-0"></div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-teal-600 mb-4">
              <CheckCircle className="h-4 w-4" /> Kolay Başlangıç
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-900 mb-5 tracking-tight">
              3 Adımda Başlayın
            </h2>
            <p className="text-base sm:text-lg text-stone-500 max-w-xl mx-auto px-2">
              Birkaç dakika içinde topluluğa katılın ve paylaşıma başlayın.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-12">
            <StepCard
              step={1}
              title="Hesabınızı Oluşturun"
              description="Ebeveyn, öğretmen veya öğrenci olarak ücretsiz kayıt olun ve profilinizi tamamlayın."
              icon={<Users className="h-6 w-6 text-teal-600" />}
            />
            <StepCard
              step={2}
              title="Topluluğa Katılın"
              description="Deneyimlerinizi paylaşın, sorular sorun ve diğer ailelerin hikayelerinden ilham alın."
              icon={<Heart className="h-6 w-6 text-teal-600" />}
            />
            <StepCard
              step={3}
              title="Uzmanlarla Bağlantı Kurun"
              description="Doğrulanmış özel eğitim uzmanlarından profesyonel rehberlik ve destek alın."
              icon={<Sparkles className="h-6 w-6 text-teal-600" />}
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* İSTATİSTİKLER */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-12 sm:py-20 bg-stone-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-900/10 to-transparent"></div>
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-3xl"></div>

        <div className="max-w-6xl mx-auto px-6 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 lg:gap-12">
            <StatItem number="1000+" label="Kayıtlı Aile" />
            <StatItem number="50+" label="Doğrulanmış Uzman" />
            <StatItem number="500+" label="Bilgi Makalesi" />
            <StatItem number="10K+" label="Topluluk Etkileşimi" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TESTİMONİALS — Aileler Ne Diyor? */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="community" className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-teal-600 mb-4">
              <Heart className="h-4 w-4" /> Topluluk Hikayeleri
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-900 mb-5 tracking-tight">
              Aileler Ne Diyor?
            </h2>
            <p className="text-base sm:text-lg text-stone-500 max-w-xl mx-auto px-2">
              Ruhefza topluluğundaki ailelerin deneyimleri ve geri bildirimleri.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <TestimonialCard
              quote="Oğlumun otizm teşhisi konduğunda çok yalnız hissediyorduk. Ruhefza sayesinde aynı yollardan geçen ailelerle tanıştık ve umudumuz arttı."
              name="Fatma Y."
              role="Ebeveyn"
              seed="mom1"
            />
            <TestimonialCard
              quote="Uzman olarak bilgilerimi paylaşabildiğim ve ailelere doğrudan ulaşabildiğim bu platform harika. Gerçek bir değişim yaratıyoruz."
              name="Dr. Mehmet A."
              role="Özel Eğitim Uzmanı"
              seed="doc1"
            />
            <TestimonialCard
              quote="Bilgi Kütüphanesi'ndeki makaleler çok faydalı. Çocuğumuzun gelişim sürecinde hangi adımları atmalıyız konusunda çok aydınlandık."
              name="Ahmet ve Elif K."
              role="Ebeveyn"
              seed="family1"
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* FINAL CTA */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-24 bg-gradient-to-br from-teal-600 to-emerald-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAyYzguODM3IDAgMTYgNy4xNjMgMTYgMTZzLTcuMTYzIDE2LTE2IDE2LTE2LTcuMTYzLTE2LTE2IDcuMTYzLTE2IDE2LTE2eiIgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIuMDUiLz48L2c+PC9zdmc+')] opacity-30"></div>

        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium text-white/90 mb-8">
            <Shield className="h-4 w-4" /> Ücretsiz ve Güvenli
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
            Bu Yolculukta<br />Yanınızdayız
          </h2>
          <p className="text-base sm:text-lg text-teal-100 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed px-2">
            Çocuğunuzun geleceği için atacağınız her adımda size destek olmak için buradayız. Hemen topluluğumuza katılın ve farkı yaşayın.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={user ? "/feed" : "/signup"}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-teal-700 font-bold rounded-2xl transition-all shadow-xl shadow-black/10 hover:shadow-black/20 transform hover:-translate-y-0.5 text-base"
            >
              {user ? "Ana Sayfaya Git" : "Ücretsiz Kayıt Olun"} <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="#features"
              onClick={(e) => handleScroll(e, 'features')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-2xl border border-white/20 hover:bg-white/20 transition-all cursor-pointer text-base"
            >
              Özellikleri Keşfet
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* FOOTER */}
      {/* ═══════════════════════════════════════════════════════ */}
      <footer className="bg-stone-900 text-stone-400 pt-12 sm:pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="relative w-10 h-10 rounded-xl overflow-hidden ring-1 ring-stone-700">
                  <Image src="/logo.png" alt="Ruhefza Logo" fill className="object-cover" />
                </div>
                <span className="text-lg font-bold text-white">Ruhefza</span>
              </div>
              <p className="text-sm text-stone-500 leading-relaxed">
                Özel eğitim alanında aileler, öğretmenler ve uzmanları bir araya getiren Türkiye&apos;nin topluluk platformu.
              </p>
            </div>

            {/* Platform */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4 tracking-wide">Platform</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/feed" className="hover:text-white transition-colors">Topluluk</Link></li>
                <li><Link href="/knowledge" className="hover:text-white transition-colors">Bilgi Kütüphanesi</Link></li>
                <li><Link href="/experts" className="hover:text-white transition-colors">Uzmanlar</Link></li>
                <li><Link href="/messages" className="hover:text-white transition-colors">Mesajlar</Link></li>
              </ul>
            </div>

            {/* Destek */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4 tracking-wide">Destek</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Hakkımızda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Gizlilik Politikası</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Kullanım Şartları</a></li>
                <li><a href="#" className="hover:text-white transition-colors">İletişim</a></li>
              </ul>
            </div>

            {/* İletişim */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4 tracking-wide">İletişim</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-teal-500" />
                  <a href="mailto:info@ruhefza.com" className="hover:text-white transition-colors">info@ruhefza.com</a>
                </li>
                <li className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-teal-500" />
                  <a href="#" className="hover:text-white transition-colors">ruhefza.com</a>
                </li>
              </ul>
              <div className="flex gap-3 mt-6">
                <a href="#" className="w-9 h-9 bg-stone-800 hover:bg-teal-600 rounded-lg flex items-center justify-center transition-colors text-stone-400 hover:text-white">
                  <Globe className="h-4 w-4" />
                </a>
                <a href="#" className="w-9 h-9 bg-stone-800 hover:bg-teal-600 rounded-lg flex items-center justify-center transition-colors text-stone-400 hover:text-white">
                  <Mail className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-stone-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-stone-600">© 2026 Ruhefza. Tüm hakları saklıdır.</p>
            <div className="flex items-center gap-2 text-xs text-stone-600">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Tüm sistemler aktif
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════

function FeatureCard({ icon, title, description, gradient, iconBg }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  iconBg: string;
}) {
  return (
    <div className={`bg-gradient-to-br ${gradient} p-5 sm:p-7 rounded-2xl border border-stone-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group`}>
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${iconBg} flex items-center justify-center mb-4 sm:mb-5 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
        {icon}
      </div>
      <h3 className="text-base sm:text-lg font-bold text-stone-900 mb-2">{title}</h3>
      <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({ step, title, description, icon }: {
  step: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="text-center group">
      <div className="relative mb-6">
        <div className="w-16 h-16 mx-auto bg-white rounded-2xl shadow-lg shadow-stone-200/50 border border-stone-100 flex items-center justify-center group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300">
          {icon}
        </div>
        <div className="absolute -top-2 -right-2 w-7 h-7 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md shadow-teal-600/30 mx-auto" style={{ left: 'calc(50% + 16px)' }}>
          {step}
        </div>
      </div>
      <h3 className="text-lg font-bold text-stone-900 mb-2">{title}</h3>
      <p className="text-sm text-stone-500 leading-relaxed max-w-xs mx-auto">{description}</p>
    </div>
  );
}

function StatItem({ number, label }: { number: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-1 sm:mb-2 tracking-tight">{number}</div>
      <div className="text-xs sm:text-sm text-stone-400 font-medium">{label}</div>
    </div>
  );
}

function TestimonialCard({ quote, name, role, seed }: {
  quote: string;
  name: string;
  role: string;
  seed: string;
}) {
  return (
    <div className="bg-stone-50 p-6 sm:p-8 rounded-2xl border border-stone-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative group">
      <Quote className="h-8 w-8 text-teal-200 mb-4" />
      <p className="text-stone-600 leading-relaxed mb-6 text-[15px]">
        &quot;{quote}&quot;
      </p>
      <div className="flex items-center gap-3 pt-4 border-t border-stone-100">
        <div className="w-10 h-10 rounded-full bg-white overflow-hidden border border-stone-100 shadow-sm">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} alt={name} />
        </div>
        <div>
          <p className="font-semibold text-stone-800 text-sm">{name}</p>
          <p className="text-xs text-teal-600 font-medium">{role}</p>
        </div>
      </div>
    </div>
  );
}
