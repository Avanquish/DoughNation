import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const Home = () => {
  const [showTop, setShowTop] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
      const scrolledAmt = doc.scrollTop || document.body.scrollTop;
      const max = Math.max(1, doc.scrollHeight - doc.clientHeight);
      setProgress(scrolledAmt / max);
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
      className="relative min-h-screen font-sans overflow-x-hidden page-surface"
      style={{ color: "#1e2329", backgroundColor: "#fffaf3" }}
    >
      <style>{`
  :root{
    --amber1:#fff7ec; --amber2:#ffe7c8; --amber3:#ffd6a1; --amber4:#f3c27e;
    --amber5:#e59b50; --amber6:#c97c2c; --coffee:#6f4a23; --coffee2:#7a5a34;
    --hdrSoft:#FFEBD5; --hdrMed:#FFE1BE; --hdrDeep:#E3B57E;

    /* Fluid tokens */
    --space-1: clamp(.5rem, 1.2vw, .75rem);
    --space-2: clamp(.75rem, 1.6vw, 1rem);
    --space-3: clamp(1rem, 2.2vw, 1.5rem);
    --space-4: clamp(1.25rem, 3vw, 2rem);
    --radius: clamp(12px, 2vw, 18px);
    --hdr-h: clamp(56px, 8svh, 76px);
    --title-xl: clamp(30px, 5.2vw, 80px);
    --title-lg: clamp(1.5rem, 1rem + 1.6vw, 2.2rem);
    --title-md: clamp(1.35rem, 1rem + 1.4vw, 2rem);
    --title-sm: clamp(1.1rem, .9rem + .8vw, 1.35rem);
    --text: clamp(.95rem, .85rem + .25vw, 1.05rem);
  }

  html,body,#root{width:100%; overflow-x:hidden}
  img,video{max-width:100%; height:auto}

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
  .orb.one{width:min(36vw,360px);height:min(36vw,360px);background:radial-gradient(circle at 30% 30%,#ffd9aa,transparent 60%);left:-8%;top:18%}
  .orb.two{width:min(42vw,420px);height:min(42vw,420px);background:radial-gradient(circle at 70% 40%,#ffc985,transparent 55%);right:-10%;top:8%;animation-delay:2s}
  .orb.three{width:min(32vw,320px);height:min(32vw,320px);background:radial-gradient(circle at 50% 60%,#ffdfb8,transparent 58%);left:6%;bottom:12%;animation-delay:4s}
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

  .heroTitle{
    display:block; margin:0 auto; max-width:1100px; text-align:center; font-weight:800; line-height:1.05; letter-spacing:.01em;
    font-size: var(--title-xl); color:#8a5a25; text-shadow: 0 2px 0 rgba(255,255,255,.55);
  }
  .heroTitle .line{display:block}
  .heroTitle .w{display:inline-block}

  @supports ((-webkit-background-clip: text) or (background-clip: text)) {
    .heroTitle.hasGradient{
      background: linear-gradient(90deg,#f6c17c,#e49a52,#bf7327);
      background-size:200% auto;
      -webkit-background-clip:text; background-clip:text;
      -webkit-text-fill-color: transparent; color: transparent;
      animation: gradientX 9s ease infinite; text-shadow:none;
    }
    .heroTitle.hasGradient .w{ background:inherit; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color: transparent; color: transparent; }
  }
  @keyframes gradientX{ 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }

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

  /* Fluid spacing / rounds */
  .hdr-pad{ padding-inline: var(--space-3) !important; padding-block: calc(var(--space-2) * .9) !important; }
  .hdr-spacer{ height: var(--hdr-h) !important; }
  .card-pad{ padding: var(--space-3) !important; border-radius: var(--radius) !important; }
`}</style>

      {/* Background */}
      <div className="bg-orbit" />
      <span className="orb one" />
      <span className="orb two" />
      <span className="orb three" />

      {/* Scroll progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[90] h-1 pointer-events-none">
        <div
          className="origin-left h-full bg-gradient-to-r from-[#f6c17c] via-[#e49a52] to-[#bf7327] transition-transform duration-100"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-[80]">
        <div
          className={`glass-soft header-gradient-line header-skin sticky-boost ${
            scrolled ? "is-scrolled" : ""
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 py-3 hdr-pad flex items-center justify-between relative">
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/images/DoughNationLogo.png"
                alt="DoughNation logo"
                className="shrink-0"
                style={{ width: "28px", height: "28px", objectFit: "contain" }}
              />
              <span
                className="font-extrabold brand-pop"
                style={{ fontSize: "clamp(1.15rem, 1rem + 1vw, 1.6rem)" }}
              >
                DoughNation
              </span>
            </Link>

            {/* Desktop nav */}
            <nav
              className="hidden md:flex items-center gap-7"
              style={{ fontSize: 15 }}
            >
              <a
                href="/"
                className="nav-link transition-colors"
                style={{ color: "#5b4631" }}
              >
                Home
              </a>
              <a
                href="#features"
                className="nav-link transition-colors"
                style={{ color: "#5b4631" }}
              >
                About
              </a>
              <Link
                to="/login"
                className="nav-link transition-colors"
                style={{ color: "#5b4631" }}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="ml-1 rounded-full text-white font-semibold btn-shimmer hover:shadow-lg hover:shadow-amber-300/30 transition-transform active:scale-[.98]"
                style={{
                  padding:
                    "clamp(.6rem, .4rem + .6vw, .9rem) clamp(1rem, .8rem + 1.2vw, 1.4rem)",
                  borderRadius: 9999,
                }}
              >
                Register
              </Link>
            </nav>

            {/* Mobile hamburger */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center rounded-md p-2 hover:scale-[.98] transition"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen ? "true" : "false"}
              aria-controls="mobile-menu"
              onClick={() => setMobileOpen((v) => !v)}
              style={{ color: "#5b4631" }}
            >
              {/* bars icon */}
              <svg
                className={`h-6 w-6 ${mobileOpen ? "hidden" : "block"}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
              {/* close icon */}
              <svg
                className={`h-6 w-6 ${mobileOpen ? "block" : "hidden"}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Mobile dropdown panel */}
          <div
            id="mobile-menu"
            className={`md:hidden transition-all duration-200 ease-out ${
              mobileOpen
                ? "max-h-96 opacity-100"
                : "max-h-0 opacity-0 pointer-events-none"
            } overflow-hidden`}
          >
            <div className="px-4 pb-3 pt-1 flex flex-col">
              <a
                href="/"
                className="block py-2 nav-link"
                style={{ color: "#5b4631" }}
                onClick={() => setMobileOpen(false)}
              >
                Home
              </a>
              <a
                href="#features"
                className="block py-2 nav-link"
                style={{ color: "#5b4631" }}
                onClick={() => setMobileOpen(false)}
              >
                About
              </a>
              <Link
                to="/login"
                className="block py-2 nav-link"
                style={{ color: "#5b4631" }}
                onClick={() => setMobileOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="inline-block self-end mt-2 rounded-full text-white font-semibold btn-shimmer hover:shadow-lg hover:shadow-amber-300/30 transition-transform active:scale-[.98]"
                style={{
                  padding:
                    "clamp(.55rem, .4rem + .5vw, .85rem) clamp(.9rem, .7rem + 1vw, 1.3rem)",
                  borderRadius: 9999,
                }}
                onClick={() => setMobileOpen(false)}
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Spacer equal to fluid header height */}
      <div aria-hidden="true" className="hdr-spacer" />

      {/* Hero */}
      <section
        className="relative overflow-hidden hero-surface"
        style={{ paddingBlock: "var(--space-4)" }}
      >
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

        <div
          className="relative z-10 max-w-6xl mx-auto px-4"
          style={{ paddingBlock: "clamp(2rem, 6vw, 4rem)" }}
        >
          <h1
            className="heroTitle hasGradient tracking-tight"
            aria-label="Welcome to DoughNation"
          >
            <span className="line">
              <span className="w">WELCOME&nbsp;</span>
              <span className="w">TO</span>
            </span>
            <span className="line">
              <span className="w">DOUGHNATION</span>
            </span>
          </h1>

          <div className="hero-cta mt-6 flex items-center justify-center gap-4 ctaFloat">
            <Link
              to="/login"
              className="rounded-full text-white font-semibold btn-shimmer hover:shadow-lg hover:shadow-amber-300/30 transition-transform active:scale-[.98]"
              style={{
                padding:
                  "clamp(.6rem, .4rem + .6vw, .9rem) clamp(1rem, .8rem + 1.2vw, 1.4rem)",
                borderRadius: 9999,
              }}
            >
              Get Started
            </Link>
            <a
              href="#how-it-works"
              className="rounded-full font-semibold transition-colors glass"
              style={{
                color: "#8a5a25",
                backgroundColor: "rgba(255,255,255,0.8)",
                padding:
                  "clamp(.6rem, .4rem + .6vw, .9rem) clamp(1rem, .8rem + 1.2vw, 1.4rem)",
                borderRadius: 9999,
              }}
            >
              Learn More
            </a>
          </div>

          <p
            className="max-w-3xl mx-auto mt-5 reveal-words"
            style={{ fontSize: "var(--text)", color: "#6b4b2b" }}
          >
            {tagline.map((w, i) => (
              <span key={i} style={{ animationDelay: `${i * 90}ms` }}>
                {w}&nbsp;
              </span>
            ))}
          </p>
        </div>
      </section>

      {/* How it works section */}
      <section
        id="how-it-works"
        className="bg-white"
        style={{ paddingBlock: "var(--space-4)" }}
      >
        <div className="max-w-6xl mx-auto px-4">
          <h2
            className="font-extrabold text-center bg-gradient-to-r from-[#f1b66f] to-[#c97c2c] bg-clip-text text-transparent"
            data-reveal
            style={{ fontSize: "var(--title-lg)" }}
          >
            How DoughNation Works
          </h2>

          <div
            className="mt-8 grid gap-6"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
            }}
          >
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
                className="glass rounded-2xl text-center hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-200/30 transition-all"
                style={{
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius)",
                  transitionDelay: `${i * 80}ms`,
                }}
                data-reveal
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-r from-[#f3c27e] to-[#c97c2c] mx-auto">
                  {s.n}
                </div>
                <h3
                  className="mt-4 font-semibold"
                  style={{
                    color: "var(--coffee)",
                    fontSize: "clamp(1rem, .9rem + .5vw, 1.25rem)",
                  }}
                >
                  {s.title}
                </h3>
                <p
                  className="mt-2"
                  style={{ color: "var(--coffee2)", fontSize: "var(--text)" }}
                >
                  {s.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section
        style={{ backgroundColor: "#fff7ec", paddingBlock: "var(--space-4)" }}
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between gap-4">
            <h2
              className="font-extrabold bg-gradient-to-r from-[#f1b66f] to-[#c97c2c] bg-clip-text text-transparent"
              data-reveal
              style={{ fontSize: "var(--title-md)" }}
            >
              Community Gallery
            </h2>
            <span
              className="text-sm"
              style={{ color: "#7a4f1c", opacity: 0.8 }}
            >
              Auto-updating highlights
            </span>
          </div>

          <div
            className="mt-6 grid gap-6"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
            }}
          >
            {pair.map((img, i) => (
              <div
                key={img.src + i}
                className="swap glass rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all"
                style={{ height: "clamp(220px, 30vw, 320px)" }}
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

      {/* DoughNation's Core Features */}
      <section
        id="features"
        className="bg-white"
        style={{ paddingBlock: "var(--space-4)" }}
      >
        <div className="max-w-5xl mx-auto px-4">
          <h2
            className="text-center font-extrabold bg-gradient-to-r from-[#f1b66f] to-[#c97c2c] bg-clip-text text-transparent"
            data-reveal
            style={{ fontSize: "var(--title-md)" }}
          >
            DoughNation Core Features
          </h2>

          <div
            className="mt-6 grid gap-6"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
            }}
          >
            {coreFeatures.map((f, i) => (
              <div
                key={f.n}
                className="glass rounded-2xl hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-200/30 transition-all"
                style={{
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius)",
                  transitionDelay: `${i * 60}ms`,
                }}
                data-reveal
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-r from-[#f3c27e] to-[#c97c2c]">
                    {f.icon}
                  </div>
                  <h3
                    className="font-semibold"
                    style={{
                      color: "var(--coffee)",
                      fontSize: "clamp(1rem, .9rem + .5vw, 1.25rem)",
                    }}
                  >
                    {f.title}
                  </h3>
                </div>
                <p
                  className="mt-3 leading-relaxed"
                  style={{ color: "var(--coffee2)", fontSize: "var(--text)" }}
                >
                  {f.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section
        style={{ backgroundColor: "#fff7ec", paddingBlock: "var(--space-4)" }}
      >
        <div className="max-w-6xl mx-auto px-4">
          <h2
            className="text-center font-semibold"
            data-reveal
            style={{ color: "#8a5a25", fontSize: "var(--title-sm)" }}
          >
            Trusted by local bakeries and charities
          </h2>
        </div>

        <div
          className="max-w-3xl mx-auto px-4 mt-5 grid gap-4 place-items-center"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
          }}
        >
          {partners.map((p, i) => (
            <a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="partner-pill hover:-translate-y-0.5 hover:shadow-xl transition-all"
              data-reveal
              style={{ transitionDelay: `${i * 60}ms` }}
              title={p.name}
            >
              <span className="partner-logo" aria-hidden="true">
                {p.emoji}
              </span>
              <span
                className="text-sm font-medium text-center"
                style={{ color: "#7a4f1c" }}
              >
                {p.name}
              </span>
            </a>
          ))}
        </div>
      </section>

      <section
        className="relative overflow-hidden"
        style={{ paddingBlock: "var(--space-4)" }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 400px at 80% 120%,#ffe7c8 0%,transparent 60%)",
          }}
        />
        <div
          className="relative z-10 max-w-6xl mx-auto px-4 text-center glass rounded-3xl"
          style={{ padding: "clamp(1.25rem, 3vw, 2rem)" }}
        >
          <h3
            className="font-extrabold bg-gradient-to-r from-[#f3b56f] to-[#c97c2c] bg-clip-text text-transparent"
            style={{ fontSize: "var(--title-md)" }}
          >
            Inventory in. Donation out.
          </h3>
          <p
            className="mt-2"
            style={{ color: "#6b4d2e", fontSize: "var(--text)" }}
          >
            Track today’s product, flag the extras, and post them in the same
            flow.
          </p>
          <div className="mt-5">
            <Link
              to="/register"
              className="inline-block rounded-full text-white font-semibold btn-shimmer hover:shadow-lg hover:shadow-amber-300/30 transition-transform active:scale-[.98]"
              style={{
                padding:
                  "clamp(.6rem, .4rem + .6vw, .9rem) clamp(1rem, .8rem + 1.2vw, 1.4rem)",
                borderRadius: 9999,
              }}
            >
              Create an Account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative" style={{ marginTop: "var(--space-3)" }}>
        <svg
          className="block w-full h-8"
          viewBox="0 0 1440 60"
          preserveAspectRatio="none"
          aria-hidden="true"
          style={{ color: "#fff3e6" }}
        >
          <path
            fill="currentColor"
            d="M0,0 C240,60 480,60 720,0 C960,-60 1200,-60 1440,0 L1440,60 L0,60 Z"
          />
        </svg>

        <div style={{ backgroundColor: "#fff3e6" }}>
          <div
            className="max-w-7xl mx-auto px-4 py-10 grid items-start text-left gap-8"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
            }}
          >
            <div className="flex flex-nowrap items-start justify-start gap-3">
              <img
                src="/images/DoughNationLogo.png"
                alt="DoughNation logo"
                className="object-contain shrink-0"
                style={{ width: 22, height: 22 }}
              />
              <div className="text-left">
                <span
                  style={{
                    color: "#c97c2c",
                    fontSize: "clamp(1.1rem, .9rem + .8vw, 1.35rem)",
                    fontWeight: 800,
                  }}
                >
                  DoughNation
                </span>
                <p
                  className="mt-2 max-w-2xl"
                  style={{ color: "#6b4d2e", fontSize: "var(--text)" }}
                >
                  Bakeries and charities, together against baked good surplus.
                </p>
              </div>
            </div>

            <div className="justify-self-center">
              <img
                src="/images/DonationHand.png"
                alt="Donation handshake"
                className="mx-auto rounded-md object-contain"
                style={{ width: "min(60vw, 150px)" }}
              />
            </div>
          </div>

          <div className="border-t border-white/70">
            <div
              className="max-w-7xl mx-auto px-4 py-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              style={{
                fontSize: "clamp(.85rem, .8rem + .2vw, .95rem)",
                color: "#6b4d2e",
              }}
            >
              <p>
                © {new Date().getFullYear()} DoughNation. All rights reserved.
              </p>

              {/* FOOTER BOTTOM LINKS: Privacy & Terms + Contact Support */}
              <div className="flex items-center gap-4">
                <Link to="/privacy-terms" className="hover:underline">
                  Privacy &amp; Terms
                </Link>
                <span
                  className="hidden sm:inline-block"
                  style={{
                    height: "1.1rem",
                    width: "1px",
                    backgroundColor: "#d7b28a",
                  }}
                />
                <Link to="/contact-support" className="hover:underline">
                  Contact Support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Back to top */}
      <div className="fixed right-6 bottom-6">
        <button
          aria-label="Back to top"
          onClick={scrollTop}
          className={`rounded-full p-3 shadow-lg transition-all active:scale-95 ${
            showTop
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-3 pointer-events-none"
          } btn-shimmer text-white`}
          title="Back to top"
        >
          ↑
        </button>
      </div>
    </div>
  );
};

export default Home;