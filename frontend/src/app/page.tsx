'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Cpu,
  Code2,
  Users2,
  Zap,
  ShieldCheck,
  Globe2,
  ChevronRight,
  Star,
  MessageSquare,
  Sparkles,
  Zap80,
  Fingerprint,
  Radio,
  Infinity
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      title: "AI Pair Programming",
      description: "Real-time AI assistance that understands your coding style and patterns.",
      icon: Cpu,
      color: "text-violet-500",
      bg: "bg-violet-500/10"
    },
    {
      title: "Real-time Collaboration",
      description: "Work together seamlessly with multi-cursor editing and live chat.",
      icon: Users2,
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      title: "Universal Translation",
      description: "Translate code between 20+ languages while preserving logic and performance.",
      icon: Globe2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10"
    },
    {
      title: "Global Snippet Library",
      description: "Save, version, and share code snippets with the global developer community.",
      icon: Code2,
      color: "text-amber-500",
      bg: "bg-amber-500/10"
    }
  ];

  const stats = [
    { label: "Active Developers", value: "125k+" },
    { label: "Code Snippets", value: "2.4M" },
    { label: "Collaborations", value: "850k" },
    { label: "AI Suggestions", value: "15M+" }
  ];

  return (
    <main className="min-h-screen bg-[#020617] selection:bg-violet-500/30 overflow-x-hidden">
      {/* Background Cinematic Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>
      {/* Navigation Overlay */}
      <nav className={cn(
        "fixed top-0 left-0 w-full z-50 transition-all duration-300 px-4 md:px-8 py-4 md:py-6",
        scrolled ? "bg-slate-950/80 backdrop-blur-md border-b border-white/5 py-4" : "bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-600/20">
              <Sparkles className="text-white" size={20} />
            </div>
            <span className="text-2xl font-black text-white tracking-tighter italic">SUNDER<span className="text-violet-500">.</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'Marketplace', 'Enterprise', 'Docs'].map(item => (
              <button key={item} className="text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors">{item}</button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-xs font-bold text-white uppercase tracking-widest px-6 py-3 hover:text-violet-400 transition-colors">Login</Link>
            <Link href="/auth/register" className="px-6 py-3 bg-white text-slate-950 text-xs font-black rounded-xl hover:bg-slate-200 transition-all uppercase tracking-widest">Sign Up</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 px-8 overflow-hidden z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-12 max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/5 border border-white/10 rounded-full text-white text-[10px] font-black uppercase tracking-[0.3em] backdrop-blur-xl animate-fade-in shadow-2xl">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Neural Engine v4.0.2 Deployment Successful
            </div>

            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[10rem] font-black text-white tracking-tight uppercase italic leading-[0.85] animate-reveal">
              Rewrite <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-white/80 to-white/20">The Void.</span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-3xl mx-auto leading-relaxed animate-fade-in delay-500">
              The apex ecosystem for high-velocity engineering. <br className="hidden md:block" />
              Sunder collapses the distance between <span className="text-white font-black italic">Thought</span> and <span className="text-white font-black italic">Execution</span>.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-8 animate-fade-in delay-700">
              <Link href="/dashboard" className="group relative w-full sm:w-auto">
                <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200" />
                <div className="relative px-12 py-6 bg-slate-950 text-white font-black rounded-2xl transition-all border border-white/10 uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-4">
                  Initialize Terminal <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              <Link href="/snippets" className="w-full sm:w-auto px-12 py-6 glass hover:bg-white/10 text-white font-black rounded-2xl transition-all uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-4 border border-white/5">
                Scan Marketplace
              </Link>
            </div>
          </div>

          {/* Trusted By / Logos */}
          <div className="mt-32 pt-20 border-t border-white/5 opacity-40">
            <p className="text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-12">Integrated with the Avant-Garde</p>
            <div className="flex flex-wrap justify-center gap-16 md:gap-24 grayscale brightness-200">
              {['Vercel', 'Supabase', 'OpenAI', 'Anthropic', 'Linear'].map(logo => (
                <span key={logo} className="text-2xl font-black italic tracking-tighter text-white/50">{logo}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 px-8 bg-slate-950/50 backdrop-blur-3xl relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="glass p-10 rounded-[40px] border border-white/5 hover:border-white/10 transition-all group hover:-translate-y-2">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-8 transition-transform group-hover:scale-110", feature.bg)}>
                  <feature.icon className={feature.color} size={28} />
                </div>
                <h3 className="text-xl font-black text-white mb-4 uppercase tracking-tight italic">{feature.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-violet-600">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
            {stats.map((stat, i) => (
              <div key={i} className="space-y-2">
                <div className="text-4xl md:text-5xl font-black text-white italic">{stat.value}</div>
                <div className="text-xs font-bold text-violet-200 uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 bg-slate-950 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-violet-500" size={24} />
              <span className="text-2xl font-black text-white tracking-tighter italic uppercase">SUNDER</span>
            </div>
            <p className="text-slate-500 text-sm max-w-xs">Empowering the next generation of engineers with collective intelligence.</p>
          </div>
          <div className="flex gap-12">
            <div className="space-y-6">
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Connect</h4>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all cursor-pointer"><Globe2 size={18} className="text-slate-400" /></div>
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all cursor-pointer"><Star size={18} className="text-slate-400" /></div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
