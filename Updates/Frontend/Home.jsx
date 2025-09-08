import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import PrivacyTerms from "./PrivacyTerms.jsx";

const Home = () => {
  // UI state toggles
  const [showTop, setShowTop] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      setShowTop(y > 320);
      setScrolled(y > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const calc = () => {
      const doc = document.documentElement;
      const scrolled = doc.scrollTop || document.body.scrollTop;
      const max = Math.max(1, doc.scrollHeight - doc.clientHeight);
      setProgress(scrolled / max);
    };
    calc();
    window.addEventListener("scroll", calc, { passive: true });
    window.addEventListener("resize", calc);
    return () => {
      window.removeEventListener("scroll", calc);
      window.removeEventListener("resize", calc);
    };
  }, []);

  const wrapRef = useRef(null);
  const ioRef = useRef(null);
  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;

    const H = window.innerHeight || 800;
    const preReveal = () => {
      root.querySelectorAll("[data-reveal]").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < H * 0.88) el.classList.add("reveal-in");
      });
    };
    preReveal();
    root.classList.add("home-reveal-ready");

    if ("IntersectionObserver" in window) {
      ioRef.current = new IntersectionObserver(
        (entries) =>
          entries.forEach(
            (e) => e.isIntersecting && e.target.classList.add("reveal-in")
          ),
        { threshold: 0.12 }
      );
      root
        .querySelectorAll("[data-reveal]")
        .forEach((el) => ioRef.current.observe(el));
    }

    const onPageShow = () => requestAnimationFrame(preReveal);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      window.removeEventListener("pageshow", onPageShow);
      try {
        ioRef.current?.disconnect();
      } catch {}
      root.classList.remove("home-reveal-ready");
    };
  }, []);

  const coreFeatures = [
    {
      n: 1,
      icon: "⏰",
      title: "Smart notifications",
      text: "Automatically alert bakeries when items near expiration, and ping nearby charities the moment donations go live.",
    },
    {
      n: 2,
      icon: "💬",
      title: "Real-time messages",
      text: "Direct chat between bakeries and charities for acceptance, timing, and packaging. Everything in one thread once a donation is accepted.",
    },
    {
      n: 3,
      icon: "📍",
      title: "Geolocation & geofencing",
      text: "Use a geolocation API to show nearby partners and set dynamic geofences. Automatic offers trigger to users within range for faster pickups.",
    },
    {
      n: 4,
      icon: "🏅",
      title: "Badges, leaderboard & analytics",
      text: "Visual dashboards for donation frequency and quantity. Motivate bakeries with badges, plus a weekly leaderboard.",
    },
    {
      n: 5,
      icon: "🧾",
      title: "Complete donation history",
      text: "End-to-end logs for transparency and traceability, such as listings, claims, handoffs, receipts, and exports for audits and reporting.",
    },
    {
      n: 6,
      icon: "📈",
      title: "Performance & feedback",
      text: "Measure usability and reliability with donation rates, response times, and satisfaction surveys.",
    },
  ];

  const partners = [
    {
      name: "R Bakery St. Scholastic Branch",
      logo: "/logos/r-bakery.png",
      emoji: "🍞",
      url: "https://www.facebook.com/rbakery.bls",
    },
    {
      name: "Scholars of Sustenance (SOS)",
      logo: "/logos/sos.png",
      emoji: "🤝",
      url: "https://www.facebook.com/SOSPHFoodRescue",
    },
    {
      name: "Arnold John Kalinga Foundation",
      logo: "/logos/kalinga.png",
      emoji: "🎗️",
      url: "https://www.facebook.com/ajkalinga",
    },
  ];

  const tagline = [
    "Helping Bakeries manage their inventory and donate surplus food to Charities in need.",
  ];
  const titleWords = ["WELCOME", " ", "TO", " ", "DOUGHNATION"];

  const gallery = [
    { src: "/images/bakeryS1.jpg", alt: "Donated breads being packed" },
    { src: "/images/bakeryS2.jpg", alt: "Fresh loaves ready for pickup" },
    { src: "/images/bakeryS3.jpg", alt: "Community volunteers" },
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % gallery.length), 3500);
    return () => clearInterval(id);
  }, []);
  const pair = [gallery[idx], gallery[(idx + 1) % gallery.length]];

  return (
    <div
      ref={wrapRef}
      className="relative min-h-screen font-sans text-[#1e2329] bg-[#fffaf3] overflow-x-hidden page-surface"
    >
      <style>{`
  :root{
    --amber1:#fff7ec; --amber2:#ffe7c8; --amber3:#ffd6a1; --amber4:#f3c27e;
    --amber5:#e59b50; --amber6:#c97c2c; --coffee:#6f4a23; --coffee2:#7a5a34;
    --hdrSoft:#FFEBD5; --hdrMed:#FFE1BE; --hdrDeep:#E3B57E;
  }
  html,body,#root{width:100%; overflow-x:hidden}
  .page-surface::before{
    content:""; position:fixed; inset:0; z-index:-15; pointer-events:none;
    background:
      linear-gradient(180deg, rgba(255,225,190,.28) 0%, rgba(255,236,210,.20) 35%, rgba(255,250,243,.16) 70%),
      radial-gradient(1200px 640px at 50% 115%, rgba(227,181,126,.18), transparent 65%);
  }
  .bg-orbit{position:fixed; inset:0; z-index:-10}
  .bg-orbit::before,.bg-orbit::after{content:""; position:absolute; inset:-10%}
  .bg-orbit::before{
    background:
      radial-gradient(1200px 600px at 22% -12%, var(--amber1) 0%, var(--amber2) 36%, var(--amber3) 62%, var(--amber2) 78%, var(--amber1) 100%),
      radial-gradient(1000px 520px at 105% 18%, rgba(255,208,153,.38), transparent 70%),
      radial-gradient(760px 420px at -10% 68%, rgba(255,210,170,.30), transparent 72%);
    animation: gradientShift 26s ease-in-out infinite alternate; filter:saturate(1.02);
  }
  .bg-orbit::after{
    background: repeating-linear-gradient(-38deg, rgba(201,124,44,.055) 0 6px, rgba(201,124,44,0) 6px 14px);
    mix-blend-mode:multiply; opacity:.18; animation:bgPan 40s linear infinite;
  }
  @keyframes gradientShift{from{transform:translate3d(0,0,0)}to{transform:translate3d(0,-20px,0)}}
  @keyframes bgPan{from{transform:translate3d(0,0,0)}to{transform:translate3d(-6%,-6%,0)}}
  .orb{position:fixed; border-radius:50%; filter:blur(36px); mix-blend-mode:multiply; opacity:.28; z-index:-10; animation:orbFloat 18s ease-in-out infinite;}
  .orb.one{width:360px;height:360px;background:radial-gradient(circle at 30% 30%,#ffd9aa,transparent 60%);left:-8%;top:18%}
  .orb.two{width:420px;height:420px;background:radial-gradient(circle at 70% 40%,#ffc985,transparent 55%);right:-10%;top:8%;animation-delay:2s}
  .orb.three{width:320px;height:320px;background:radial-gradient(circle at 50% 60%,#ffdfb8,transparent 58%);left:6%;bottom:12%;animation-delay:4s}
  @keyframes orbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-28px)}}
  .glass{backdrop-filter: blur(12px); background: linear-gradient(180deg, rgba(255,255,255,.72), rgba(255,255,255,.52)); border:1px solid rgba(255,255,255,.7)}
  .glass-soft{backdrop-filter: blur(10px); background: linear-gradient(180deg, rgba(255,255,255,.66), rgba(255,255,255,.46)); border:1px solid rgba(255,255,255,.65)}
  .header-skin{position:relative}
  .header-skin.glass-soft{background:none !important; border-color: rgba(201,124,44,.18)}
  .header-skin::before{
    content:""; position:absolute; inset:0; z-index:-1;
    background:
      linear-gradient(180deg, var(--hdrSoft) 0%, var(--hdrMed) 65%, var(--hdrSoft) 100%),
      radial-gradient(900px 240px at 8% 120%, rgba(243,194,126,.32) 0%, rgba(243,194,126,0) 60%),
      radial-gradient(900px 240px at 92% 120%, rgba(235,183,132,.28) 0%, rgba(235,183,132,0) 60%);
    mask-image: linear-gradient(to bottom, #000 86%, transparent 100%);
  }
  .header-skin::after{
    content:""; position:absolute; inset:0; z-index:-1; pointer-events:none;
    background-image: radial-gradient(rgba(227,181,126,.21) 20%, transparent 21%);
    background-size: 12px 12px;
    background-position: 0 0;
    animation: dotsDrift 36s linear infinite;
    opacity:.33; mix-blend-mode:multiply;
    mask-image: linear-gradient(to bottom, #000 80%, transparent 100%);
  }
  @keyframes dotsDrift{from{background-position:0 0}to{background-position:240px 0}}
  .sticky-boost{transition: box-shadow .25s ease, backdrop-filter .25s ease; border-bottom:1px solid rgba(201,124,44,.14)}
  .sticky-boost.is-scrolled{box-shadow: 0 10px 28px rgba(201,124,44,.18)}
  .nav-link{position:relative}
  .nav-link:after{content:""; position:absolute; left:0; right:0; bottom:-6px; height:2px; background:linear-gradient(90deg,var(--amber4),var(--amber6)); transform:scaleX(0); transform-origin:0 50%; transition:transform .35s}
  .nav-link:hover:after{transform:scaleX(1)}
  .header-gradient-line{position:relative}
  .header-gradient-line:after{content:""; position:absolute; left:0; right:0; bottom:-1px; height:2px; background:linear-gradient(90deg,transparent, var(--amber5), var(--amber6), transparent); opacity:.5}
  .brand-pop{
    background: linear-gradient(90deg, #E3B57E 0%, #F3C27E 25%, #E59B50 50%, #C97C2C 75%, #E3B57E 100%);
    background-size: 300% 100%;
    -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color: transparent; color:transparent;
    animation: brandShimmer 6s ease-in-out infinite;
    letter-spacing:.2px;
  }
  @keyframes brandShimmer{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
  .logo-bread{transform-origin:50% 60%; filter: drop-shadow(0 2px 4px rgba(201,124,44,.25)); animation: logoFloat 5.5s ease-in-out infinite}
  @keyframes logoFloat{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-4px) rotate(-2deg)}}
  .hero-surface{
    background:
      linear-gradient(180deg, rgba(255,225,190,.72) 0%, rgba(255,236,210,.58) 38%, rgba(255,250,243,.45) 100%),
      radial-gradient(900px 380px at 20% 15%, rgba(243,194,126,.16), transparent 60%),
      radial-gradient(900px 380px at 80% 12%, rgba(243,194,126,.14), transparent 60%);
  }
  .hero-fig{
    position:absolute; top:60%; transform:translateY(-50%);
    width: clamp(80px, 10vw, 100px);
    pointer-events:none; user-select:none;
    filter: drop-shadow(0 8px 18px rgba(201,124,44,.18));
    opacity:.96; z-index:5;
    animation: sideFloat 5s ease-in-out infinite;
  }
  .hero-fig.left{left: max(10px, 13vw)}
  .hero-fig.right{right: max(10px, 13vw); animation-delay:1.1s}
  @keyframes sideFloat{0%,100%{transform:translateY(-50%)}50%{transform:translateY(calc(-50% - 10px))}}
  .home-reveal-ready [data-reveal]{opacity:0; transform:translateY(18px) scale(.98); transition:opacity .6s ease, transform .6s ease}
  .home-reveal-ready .reveal-in{opacity:1; transform:translateY(0) scale(1)}
  .heroTitle{display:inline-block; background: linear-gradient(90deg,#f6c17c,#e49a52,#bf7327); background-size:200% auto; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color: transparent; color:transparent; animation: gradientX 9s ease infinite}
  .heroTitle .w{display:inline-block; background:inherit; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color: transparent; color:transparent; opacity:0; transform:translateY(22px) scale(.96); animation: titleWord .72s cubic-bezier(.34,1.56,.64,1) forwards}
  @keyframes titleWord{to{opacity:1; transform:translateY(0) scale(1)}}
  @keyframes gradientX{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
  .ctaFloat{animation: breadFloat 5.5s ease-in-out infinite}
  @keyframes breadFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
  .reveal-words span{opacity:0; transform:translateY(8px); display:inline-block; animation:wordUp .66s ease forwards}
  @keyframes wordUp{to{opacity:1; transform:translateY(0)}}
  .swap{animation:swapFade 680ms ease both}
  @keyframes swapFade{from{opacity:.0; transform:scale(.98)} to{opacity:1; transform:scale(1)}}
  @keyframes shimmer { to { background-position: 200% 0 } }
  .btn-shimmer{background: linear-gradient(90deg,#C97C2C 0%,#E5A65A 35%,#F3C27E 50%,#E5A65A 65%,#C97C2C 100%); background-size: 200% 100%; animation: shimmer 2.5s linear infinite}
  .partner-pill{display:inline-flex; align-items:center; gap:.6rem; padding:.65rem 1rem; border-radius:9999px; background:linear-gradient(180deg,#fff,#fffaf5); border:1px solid rgba(0,0,0,.06); box-shadow:0 8px 22px rgba(201,124,44,.10); text-decoration:none}
  .partner-logo{width:34px;height:34px;border-radius:9999px;display:flex;align-items:center;justify-content:center; background:linear-gradient(180deg,#FFE7C5,#F7C489); color:#7a4f1c; font-size:18px; flex-shrink:0; border:1px solid #fff3e0}
`}</style>

      <div className="bg-orbit" />
      <span className="orb one" />
      <span className="orb two" />
      <span className="orb three" />

      <div className="fixed top-0 left-0 right-0 z-[90] h-1 pointer-events-none">
        <div
          className="origin-left h-full bg-gradient-to-r from-[#f6c17c] via-[#e49a52] to-[#bf7327] transition-transform duration-100"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      {/* ===== Header ===== */}
      <header className="fixed top-0 left-0 right-0 z-[80]">
        <div
          className={`glass-soft header-gradient-line header-skin sticky-boost ${
            scrolled ? "is-scrolled" : ""
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/images/DoughNationLogo.png"
                alt="DoughNation logo"
                className="w-7 h-7 object-contain logo-bread"
              />
              <span className="text-2xl font-extrabold brand-pop">
                DoughNation
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-7 text-[15px]">
              <a
                href="/"
                className="nav-link text-[#5b4631] hover:text-[#8b5f28] transition-colors"
              >
                Home
              </a>
              <a
                href="#features"
                className="nav-link text-[#5b4631] hover:text-[#8b5f28] transition-colors"
              >
                About
              </a>
              <Link
                to="/login"
                className="nav-link text-[#5b4631] hover:text-[#8b5f28] transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="ml-1 rounded-full px-4 py-2 text-white font-semibold btn-shimmer hover:shadow-lg hover:shadow-amber-300/30 transition-transform active:scale-[.98]"
              >
                Register
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div aria-hidden="true" className="h-[64px] md:h-[68px]" />

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden hero-surface">
        <img
          src="/images/BakeryGirl.png"
          alt=""
          aria-hidden="true"
          className="hero-fig left hidden md:block"
        />
        <img
          src="/images/BakeryBoy.png"
          alt=""
          aria-hidden="true"
          className="hero-fig right hidden md:block"
        />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
          <h1
            className="heroTitle text-[36px] sm:text-5xl lg:text-6xl font-extrabold tracking-tight"
            aria-label="Welcome to DoughNation"
          >
            {titleWords.map((w, i) => (
              <span
                key={i}
                className="w"
                style={{ animationDelay: `${i * 110}ms` }}
              >
                {w}&nbsp;
              </span>
            ))}
          </h1>

          {/* CHANGE: Learn More jumps to 'How DoughNation Works' */}
          <div className="mt-8 flex items中心 justify-center gap-4 sub-fade ctaFloat">
            <Link
              to="/login"
              className="rounded-full px-6 sm:px-7 py-3 text-white font-semibold btn-shimmer hover:shadow-lg hover:shadow-amber-300/30 transition-transform active:scale-[.98]"
            >
              Get Started
            </Link>
            <a
              href="#how-it-works"
              className="rounded-full px-5 sm:px-6 py-3 font-semibold text-[#8a5a25] bg-white/80 hover:bg-white transition-colors glass"
            >
              Learn More
            </a>
          </div>

          <p className="max-w-3xl mx-auto mt-6 text-lg sm:text-xl text-[#6b4b2b] reveal-words">
            {tagline.map((w, i) => (
              <span key={i} style={{ animationDelay: `${i * 90}ms` }}>
                {w}&nbsp;
              </span>
            ))}
          </p>
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section id="how-it-works" className="py-12 sm:py-16 bg-white wave-top">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2
            className="text-3xl sm:text-4xl font-extrabold text-center bg-gradient-to-r from-[#f1b66f] to-[#c97c2c] bg-clip-text text-transparent"
            data-reveal
          >
            How DoughNation Works
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                n: 1,
                title: "Track inventory in one place",
                text: "Log today’s bakes and what’s left. Get notifications when items are nearing day-end so nothing sneaks past you.",
              },
              {
                n: 2,
                title: "Start a donation in seconds",
                text: "Select items, set quantity and a pickup window. The app then notifies charities near you!",
              },
              {
                n: 3,
                title: "Coordinate with charities",
                text: "When a charity accepts, you get a ping. Chat in-app to confirm timing, and pickup details.",
              },
            ].map((s, i) => (
              <div
                key={s.n}
                className="glass rounded-2xl p-6 text-center hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-200/30 transition-all"
                data-reveal
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-r from-[#f3c27e] to-[#c97c2c] mx-auto">
                  {s.n}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-[var(--coffee)]">
                  {s.title}
                </h3>
                <p className="mt-2 text-[var(--coffee2)]">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Gallery ===== */}
      <section className="py-16 bg-[#fff7ec] wave-bottom">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <h2
              className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-[#f1b66f] to-[#c97c2c] bg-clip-text text-transparent"
              data-reveal
            >
              Community Gallery
            </h2>
            <span className="text-sm text-[#7a4f1c] opacity-80">
              Auto-updating highlights
            </span>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {pair.map((img, i) => (
              <div
                key={img.src + i}
                className="swap glass rounded-2xl overflow-hidden h-[220px] sm:h-[260px] lg:h-[300px] hover:-translate-y-1 hover:shadow-xl transition-all"
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Core Features ===== */}
      <section id="features" className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2
            className="text-2xl sm:text-3xl font-extrabold text-center bg-gradient-to-r from-[#f1b66f] to-[#c97c2c] bg-clip-text text-transparent"
            data-reveal
          >
            DoughNation Core Features
          </h2>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {coreFeatures.map((f, i) => (
              <div
                key={f.n}
                className="glass rounded-2xl p-6 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-200/30 transition-all"
                data-reveal
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-r from-[#f3c27e] to-[#c97c2c]">
                    {f.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--coffee)]">
                    {f.title}
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[var(--coffee2)]">
                  {f.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Partners ===== */}
      <section className="py-14 bg-[#fff7ec]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2
            className="text-xl font-semibold text-center text-[#8a5a25]"
            data-reveal
          >
            Trusted by local bakeries and charities
          </h2>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 place-items-center">
          {partners.map((p, i) => (
            <a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="partner-pill hover:-translate-y-[2px] hover:shadow-xl transition-all"
              data-reveal
              style={{ transitionDelay: `${i * 60}ms` }}
              title={p.name}
            >
              <span className="partner-logo" aria-hidden="true">
                {p.emoji}
              </span>
              <span className="text-[#7a4f1c] text-sm font-medium text-center">
                {p.name}
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="relative py-16 sm:py-20 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 400px at 80% 120%,#ffe7c8 0%,transparent 60%)",
          }}
        />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center glass rounded-3xl py-10 shadow-[0_20px_60px_rgba(201,124,44,.18)]">
          <h3 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-[#f3b56f] to-[#c97c2c] bg-clip-text text-transparent">
            Inventory in. Donation out.{" "}
          </h3>
          <p className="mt-2 text-[#6b4d2e]">
            Track today’s product, flag the extras, and post them in the same
            flow.{" "}
          </p>
          <div className="mt-6">
            <Link
              to="/register"
              className="inline-block rounded-full px-6 sm:px-7 py-3 text-white font-semibold btn-shimmer hover:shadow-lg hover:shadow-amber-300/30 transition-transform active:scale-[.98]"
            >
              Create an Account
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="relative mt-8">
        <svg
          className="block w-full h-8 text-[#fff3e6]"
          viewBox="0 0 1440 60"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M0,0 C240,60 480,60 720,0 C960,-60 1200,-60 1440,0 L1440,60 L0,60 Z"
          />
        </svg>

        <div className="bg-[#fff3e6]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid gap-8 md:grid-cols-3 items-start">
            <div className="flex items-start gap-3">
              <img
                src="/images/DoughNationLogo.png"
                alt="DoughNation logo"
                className="w-[22px] h-[22px] object-contain logo-bread"
              />
              <div>
                <span className="text-xl font-extrabold text-[#c97c2c]">
                  DoughNation
                </span>
                <p className="mt-2 max-w-2xl text-sm text-[#6b4d2e]">
                  Bakeries and charities, together against food waste.
                </p>
              </div>
            </div>

            <div className="md:justify-self-center">
              <img
                src="/images/DonationHand.png"
                alt="Donation handshake"
                className="w-[min(60vw,150px)] rounded-md object-contain"
              />
            </div>

            <div className="md:justify-self-end">
              <h4 className="font-semibold text-[#6f4a23]">Contact Us</h4>
              <ul className="mt-3 space-y-2 text-sm text-[#6b4d2e]">
                <li>
                  <span>Questions: doughnationsupport@gmail.com</span>
                </li>
                <li>
                  <span>Need help? Email doughnationsupport@gmail.com</span>
                </li>
                <li>
                  <span>Partnerships: doughnationpartnerships@gmail.com</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/70">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col md:flex-row items-center justify-between text-sm text-[#6b4d2e]">
              <p>
                © {new Date().getFullYear()} DoughNation. All rights reserved.
              </p>
              <p className="mt-2 md:mt-0">
                <Link to="/privacy-terms" className="hover:underline">
                  Privacy &amp; Terms
                </Link>
              </p>
            </div>
          </div>
        </div>
      </footer>

      <button
        aria-label="Back to top"
        onClick={scrollTop}
        className={`fixed right-4 bottom-4 sm:right-6 sm:bottom-6 rounded-full p-3 shadow-lg transition-all active:scale-95 ${
          showTop
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-3 pointer-events-none"
        } btn-shimmer text-white`}
        title="Back to top"
      >
        ↑
      </button>
    </div>
  );
};

export default Home;