import React from "react";
import { Link } from "react-router-dom";

const PrivacyTerms = () => {
  return (
    <div className="relative min-h-screen font-sans text-[#1e2329] bg-[#fffaf3] overflow-x-hidden page-surface">
      <style>{`
  :root{
    --amber1:#fff7ec; --amber2:#ffe7c8; --amber3:#ffd6a1; --amber4:#f3c27e;
    --amber5:#e59b50; --amber6:#c97c2c; --coffee:#6f4a23; --coffee2:#7a5a34;
  }
  html,body,#root{width:100%; overflow-x:hidden}

  /* Subtle layered page background (fixed) */
  .page-surface::before{
    content:""; position:fixed; inset:0; z-index:-15; pointer-events:none;
    background:
      linear-gradient(180deg, rgba(255,225,190,.28) 0%, rgba(255,236,210,.20) 35%, rgba(255,250,243,.16) 70%),
      radial-gradient(1200px 640px at 50% 115%, rgba(227,181,126,.18), transparent 65%);
  }

  /* Moving radial accents + fine diagonals for depth (same feel as home) */
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

  /* Floating blurred orbs (same as home) */
  .orb{position:fixed; border-radius:50%; filter:blur(36px); mix-blend-mode:multiply; opacity:.28; z-index:-10; animation:orbFloat 18s ease-in-out infinite;}
  .orb.one{width:360px;height:360px;background:radial-gradient(circle at 30% 30%,#ffd9aa,transparent 60%);left:-8%;top:18%}
  .orb.two{width:420px;height:420px;background:radial-gradient(circle at 70% 40%,#ffc985,transparent 55%);right:-10%;top:8%;animation-delay:2s}
  .orb.three{width:320px;height:320px;background:radial-gradient(circle at 50% 60%,#ffdfb8,transparent 58%);left:6%;bottom:12%;animation-delay:4s}
  @keyframes orbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-28px)}}

  /* Glass cards & soft variant */
  .glass{backdrop-filter: blur(12px); background: linear-gradient(180deg, rgba(255,255,255,.72), rgba(255,255,255,.52)); border:1px solid rgba(255,255,255,.7)}
  .glass-soft{backdrop-filter: blur(10px); background: linear-gradient(180deg, rgba(255,255,255,.66), rgba(255,255,255,.46)); border:1px solid rgba(255,255,255,.65)}

  /* Header skin (same gradient/dots as homepage) */
  .header-skin{position:relative}
  .header-skin.glass-soft{background:none !important; border-color: rgba(201,124,44,.18)}
  .header-skin::before{
    content:""; position:absolute; inset:0; z-index:-1;
    background:
      linear-gradient(180deg, #FFEBD5 0%, #FFE1BE 65%, #FFEBD5 100%),
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

  /* Sticky header shadow */
  .sticky-boost{transition: box-shadow .25s ease, backdrop-filter .25s ease; border-bottom:1px solid rgba(201,124,44,.14)}
  .sticky-boost.is-scrolled{box-shadow: 0 10px 28px rgba(201,124,44,.18)}

  /* Brand shimmering text + floating logo (same as home) */
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

  /* Buttons */
  @keyframes shimmer { to { background-position: 200% 0 } }
  .btn-shimmer{background: linear-gradient(90deg,#C97C2C 0%,#E5A65A 35%,#F3C27E 50%,#E5A65A 65%,#C97C2C 100%); background-size: 200% 100%; animation: shimmer 2.5s linear infinite}

  /* Title gradient */
  .title-grad{background:linear-gradient(90deg,#f1b66f,#c97c2c); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent}

  /* ======= MEDIA QUERIES ======= */

  /* Phones */
  @media screen and (min-width:300px) and (max-width:574px){
    .hdr-pad{ padding-top:.5rem; padding-bottom:.5rem; }
    .title-grad{ font-size: 26px !important; }
    .glass{ border-radius: 18px !important; }
    .pg-pad{ padding-top: 1.25rem !important; padding-bottom: 1.25rem !important; }
    .card-pad{ padding: 1rem !important; }
  }

  /* Small tablets */
  @media screen and (min-width:575px) and (max-width:767px){
    .title-grad{ font-size: 30px !important; }
    .card-pad{ padding: 1.25rem !important; }
  }

  /* Large tablets */
  @media screen and (min-width:768px) and (max-width:959px){
    .title-grad{ font-size: 34px !important; }
  }

  /* Small desktops */
  @media screen and (min-width:1368px) and (max-width:1920px){
    .title-grad{ font-size: 36px !important; }
    .card-pad{ padding: 1.35rem !important; }
  }

  /* Large desktops */
  @media screen and (min-width:1921px) and (max-width:4096px){
    .title-grad{ font-size: 40px !important; }
    .card-pad{ padding: 1.5rem !important; }
  }
`}</style>

      {/* Background layers to match the home vibe */}
      <div className="bg-orbit" />
      <span className="orb one" />
      <span className="orb two" />
      <span className="orb three" />

      {/* Header: brand on left, only Back to Home on right */}
      <header className="fixed top-0 left-0 right-0 z-[80]">
        <div className="glass-soft header-skin sticky-boost header-gradient-line">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between hdr-pad">
            <div className="flex items-center gap-3 select-none">
              <img
                src="/images/DoughNationLogo.png"
                alt="DoughNation logo"
                className="w-7 h-7 object-contain logo-bread"
              />
              <span className="text-2xl font-extrabold brand-pop">
                DoughNation
              </span>
            </div>

            <Link
              to="/"
              className="rounded-full px-4 py-2 text-white font-semibold btn-shimmer hover:shadow-lg hover:shadow-amber-300/30 transition-transform active:scale-[.98]"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>
      <div aria-hidden="true" className="h-[64px] md:h-[68px]" />

      {/* Page body */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 pg-pad">
        <header className="text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold title-grad">
            Privacy &amp; Terms
          </h1>
          <p className="mt-2 text-[#6b4d2e]">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </header>

        {/* Privacy */}
        <section className="mt-8 glass rounded-2xl p-6 card-pad">
          <h2 className="text-xl font-semibold text-[var(--coffee)]">
            Privacy Policy
          </h2>
          <p className="mt-2 text-[var(--coffee2)]">
            We respect your privacy. This page explains what information we
            collect, why we collect it, and how we protect it.
          </p>
          <ul className="mt-4 list-disc pl-6 space-y-2 text-[var(--coffee2)]">
            <li>
              <span className="font-medium text-[var(--coffee)]">
                Information we collect:
              </span>{" "}
              account details (name, email), bakery/charity profile info,
              inventory and donation activity, basic device/usage data.
            </li>
            <li>
              <span className="font-medium text-[var(--coffee)]">
                How we use it:
              </span>{" "}
              to run the app, send notifications, coordinate pickups, improve
              features, and keep the platform secure.
            </li>
            <li>
              <span className="font-medium text-[var(--coffee)]">Sharing:</span>{" "}
              we only share what’s required to connect bakeries and charities
              (e.g., donation details and pickup info) or when legally
              necessary.
            </li>
            <li>
              <span className="font-medium text-[var(--coffee)]">
                Your choices:
              </span>{" "}
              request access, correction, or deletion of your data,{" "}
              <span className="font-mono">submit complaints to our Admin</span>.
            </li>
            <li>
              <span className="font-medium text-[var(--coffee)]">
                Retention & security:
              </span>{" "}
              data is kept only as long as needed for operations/legal reasons
              and is protected with reasonable technical and organizational
              measures.
            </li>
          </ul>
        </section>

        {/* Terms */}
        <section className="mt-6 glass rounded-2xl p-6 card-pad">
          <h2 className="text-xl font-semibold text-[var(--coffee)]">
            Terms of Service
          </h2>
          <p className="mt-2 text-[var(--coffee2)]">
            By using DoughNation, you agree to these terms. Please read them
            carefully.
          </p>
          <ul className="mt-4 list-disc pl-6 space-y-2 text-[var(--coffee2)]">
            <li>
              <span className="font-medium text-[var(--coffee)]">
                Eligibility & accounts:
              </span>{" "}
              you’re responsible for your account and keeping login details
              secure.
            </li>
            <li>
              <span className="font-medium text-[var(--coffee)]">
                Acceptable use:
              </span>{" "}
              don’t misuse the platform, post false listings, or violate
              laws/food safety rules.
            </li>
            <li>
              <span className="font-medium text-[var(--coffee)]">
                Donations:
              </span>{" "}
              bakeries are responsible for accurate listings and safe packaging;
              charities for timely pickup and handling.
            </li>
            <li>
              <span className="font-medium text-[var(--coffee)]">
                Limitation of liability:
              </span>{" "}
              the service is provided “as is”; to the maximum extent allowed,
              we’re not liable for indirect or consequential damages.
            </li>
            <li>
              <span className="font-medium text-[var(--coffee)]">Changes:</span>{" "}
              we may update these terms or the privacy policy. We’ll post
              updates on this page and note the “Last updated” date above.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
};

export default PrivacyTerms;