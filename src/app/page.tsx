"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Users, MessageCircle, BookOpen, ArrowRight, Shield, Star, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
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
        top: targetElement.offsetTop - 80, // Adjust for navbar height
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/20 bg-white/60 backdrop-blur-md transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden shadow-md shadow-teal-200">
              <Image
                src="/logo.png"
                alt="Ruhefza Logo"
                fill
                className="object-cover"
              />
            </div>
            <span className="text-xl font-bold text-stone-800 tracking-tight">
              Ruhefza<span className="text-teal-600">App</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" onClick={(e) => handleScroll(e, 'features')} className="text-sm font-medium text-stone-600 hover:text-teal-600 transition-colors cursor-pointer">Özellikler</a>
            <a href="#community" onClick={(e) => handleScroll(e, 'community')} className="text-sm font-medium text-stone-600 hover:text-teal-600 transition-colors cursor-pointer">Topluluk</a>
            <Link href="/knowledge" className="text-sm font-medium text-stone-600 hover:text-teal-600 transition-colors">Kütüphane</Link>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <Link
                href="/feed"
                className="px-5 py-2.5 text-sm font-medium bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
              >
                Uygulamaya Git
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors hidden sm:block"
                >
                  Giriş Yap
                </Link>
                <Link
                  href="/signup"
                  className="px-5 py-2.5 text-sm font-medium bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                >
                  Kayıt Ol
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-24 lg:pt-32 pb-20 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-100 via-white to-white -z-10 opacity-70"></div>
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-purple-100/50 rounded-full blur-3xl -z-10 mix-blend-multiply animate-float"></div>
        <div className="absolute top-40 left-0 w-[400px] h-[400px] bg-blue-100/50 rounded-full blur-3xl -z-10 mix-blend-multiply animate-float-delayed"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-600 ring-1 ring-teal-600/20 bg-teal-50 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <span className="w-2 h-2 rounded-full bg-teal-500 mr-2 animate-pulse"></span>
              Yeni Nesil Eğitim Platformu
            </div>
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-stone-900 mb-8 leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
              Özel Eğitimde <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-indigo-600">Köprüler Kuruyoruz</span>
            </h1>
            <p className="text-xl text-stone-600 mb-10 leading-relaxed max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              Aileler, öğretmenler ve uzmanlar tek bir platformda. Deneyim paylaşın, sorular sorun ve eğitim yolculuğunuzda yalnız kalmayın.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <Link
                href={user ? "/feed" : "/signup"}
                className="w-full sm:w-auto px-8 py-4 text-base font-semibold bg-teal-600 text-white rounded-full hover:bg-teal-700 transition-all shadow-lg shadow-teal-200 hover:shadow-teal-300 transform hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                {user ? "Akışa Dön" : "Hemen Ücretsiz Başla"} <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#features"
                onClick={(e) => handleScroll(e, 'features')}
                className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-stone-700 bg-white border border-stone-200 rounded-full hover:bg-stone-50 transition-all hover:border-stone-300 flex items-center justify-center cursor-pointer"
              >
                Nasıl Çalışır?
              </a>
            </div>

            <div className="mt-12 flex items-center justify-center gap-8 text-stone-500 text-sm animate-in fade-in duration-1000 delay-500">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-stone-200 overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 123}`} alt="User" />
                  </div>
                ))}
                <div className="w-10 h-10 rounded-full border-2 border-white bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-600">+2k</div>
              </div>
              <div>
                <div className="flex gap-0.5 text-yellow-400 mb-0.5">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                </div>
                <span className="font-medium text-stone-900">1000+ Aile</span> Tarafından Seviliyor
              </div>
            </div>
          </div>

          {/* Visual Showcase (Floating Cards) */}
          <div className="relative mt-20 h-[400px] lg:h-[500px] w-full max-w-5xl mx-auto perspective-[2000px]">
            {/* Card 1: Article - Left */}
            <div className="absolute left-0 lg:-left-12 top-20 w-72 glass-card rounded-2xl p-4 shadow-xl animate-float-delayed transform rotate-[-6deg] hidden md:block z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600"><BookOpen className="h-5 w-5" /></div>
                <div>
                  <div className="h-2 w-24 bg-stone-200 rounded mb-1"></div>
                  <div className="h-2 w-16 bg-stone-100 rounded"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full bg-stone-100 rounded"></div>
                <div className="h-2 w-full bg-stone-100 rounded"></div>
                <div className="h-2 w-2/3 bg-stone-100 rounded"></div>
              </div>
              <div className="mt-4 flex gap-2">
                <span className="text-[10px] px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full">Otizm</span>
                <span className="text-[10px] px-2 py-1 bg-stone-100 text-stone-600 rounded-full">5 dk okuma</span>
              </div>
            </div>

            {/* Card 2: Chat - Right */}
            <div className="absolute right-0 lg:-right-12 top-40 w-72 glass-card rounded-2xl p-4 shadow-xl animate-float transform rotate-[6deg] hidden md:block z-10">
              <div className="flex items-center gap-3 mb-4 border-b border-stone-100 pb-2">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-purple-100 overflow-hidden"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" /></div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <p className="font-semibold text-sm">Ayşe Yılmaz</p>
                  <p className="text-xs text-green-600">Özel Eğitim Uzmanı</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-stone-100 rounded-2xl rounded-tl-none p-3 text-xs text-stone-700 self-start w-[85%]">
                  Merhaba Yasin Bey, Ali&apos;nin son durumunu değerlendirmek için...
                </div>
                <div className="bg-teal-500 text-white rounded-2xl rounded-tr-none p-3 text-xs self-end ml-auto w-[85%] shadow-md">
                  Teşekkürler hocam, yarın uygun saatiniz var mı?
                </div>
              </div>
            </div>

            {/* Card 3: Feed - Center */}
            <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[90%] md:w-[500px] bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden z-20">
              <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-white shadow-sm overflow-hidden bg-white">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" alt="User" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-800 text-sm">Zeynep K.</p>
                    <p className="text-xs text-stone-500">2 saat önce</p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="text-stone-400"><Shield className="h-4 w-4" /></Button>
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-lg mb-2 text-stone-900">Bugün harika bir gelişme oldu! ✨</h3>
                <p className="text-stone-600 leading-relaxed text-sm">
                  Oğlum ilk kez göz teması kurarak &quot;anne&quot; dedi. Bu anı o kadar uzun zamandır bekliyorduk ki... Sabrın ve eğitimin gücüne inanın. Asla pes etmeyin dostlar! ❤️
                </p>
                <div className="mt-4 h-32 w-full bg-stone-100 rounded-lg flex items-center justify-center text-stone-400 text-xs border-2 border-dashed border-stone-200">
                  (Görsel Alanı)
                </div>
              </div>
              <div className="px-6 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-1.5 text-rose-500 text-sm font-medium bg-rose-50 px-3 py-1.5 rounded-full">
                    <Heart className="h-4 w-4 fill-current" /> 128
                  </button>
                  <button className="flex items-center gap-1.5 text-stone-500 text-sm font-medium hover:bg-stone-100 px-3 py-1.5 rounded-full transition-colors">
                    <MessageCircle className="h-4 w-4" /> 42
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-stone-50/50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-sm font-bold tracking-wide text-teal-600 uppercase mb-3">Özellikler</h2>
            <p className="text-3xl font-extrabold text-stone-900 sm:text-4xl mb-4">
              İhtiyacınız Olan Her Şey
            </p>
            <p className="text-lg text-stone-600">
              Ruhefza App, eğitim sürecini kolaylaştırmak ve desteklemek için tasarlandı.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Users className="h-8 w-8 text-teal-600" />}
              title="Topluluk Desteği"
              description="Benzer yollardan geçen ailelerle tanışın, hikayenizi paylaşın ve tecrübe aktarımı yapın."
              color="bg-teal-50"
            />
            <FeatureCard
              icon={<MessageCircle className="h-8 w-8 text-purple-600" />}
              title="Uzman İletişimi"
              description="Öğretmenler ve uzmanlarla doğrudan mesajlaşın, sorularınızı güvenle sorun."
              color="bg-purple-50"
            />
            <FeatureCard
              icon={<BookOpen className="h-8 w-8 text-emerald-600" />}
              title="Bilgi Kütüphanesi"
              description="Güvenilir kaynaklardan derlenmiş makaleler, rehberler ve eğitim materyalleri."
              color="bg-emerald-50"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-stone-900 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Bu Yolculukta Yanınızdayız</h2>
          <p className="text-lg text-stone-300 mb-10 max-w-2xl mx-auto">
            Çocuğunuzun geleceği için atacağınız her adımda size destek olmak için buradayız. Hemen topluluğumuza katılın.
          </p>
          <Link
            href={user ? "/feed" : "/signup"}
            className="inline-flex items-center px-8 py-4 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-full transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_30px_rgba(14,165,233,0.5)] transform hover:scale-105"
          >
            {user ? "Ana Sayfaya Git" : "Ücretsiz Kayıt Olun"}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8 rounded-md overflow-hidden">
              <Image
                src="/logo.png"
                alt="Ruhefza Logo"
                fill
                className="object-cover"
              />
            </div>
            <span className="font-bold text-stone-900">Ruhefza App</span>
          </div>
          <div className="flex gap-8 text-sm text-stone-500">
            <Link href="#" className="hover:text-stone-900 transition-colors">Hakkımızda</Link>
            <Link href="#" className="hover:text-stone-900 transition-colors">Gizlilik</Link>
            <Link href="#" className="hover:text-stone-900 transition-colors">İletişim</Link>
          </div>
          <p className="text-sm text-stone-400">© 2024 Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, color }: { icon: React.ReactNode, title: string, description: string, color: string }) {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
      <div className={`w-16 h-16 rounded-2xl ${color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-stone-900 mb-3">{title}</h3>
      <p className="text-stone-600 leading-relaxed">{description}</p>
    </div>
  )
}
