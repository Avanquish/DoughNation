import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";

const ContactSupport = () => {
  const [messageData, setMessageData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSending, setIsSending] = useState(false);

  const handleInputChange = (field, value) => {
    setMessageData({ ...messageData, [field]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSending) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(messageData.email)) {
      return Swal.fire({
        icon: "error",
        title: "Invalid Email",
        text: "Please enter a valid email address.",
        confirmButtonColor: "#C97C2C",
      });
    }

    setIsSending(true);

    try {
      // Send as FormData since backend expects Form fields
      const formData = new FormData();
      formData.append("name", messageData.name);
      formData.append("email", messageData.email);
      formData.append("subject", messageData.subject);
      formData.append("message", messageData.message);

      await axios.post("https://api.doughnationhq.cloud/contact-support", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      Swal.fire({
        icon: "success",
        title: "Message Sent!",
        text: "Your message has been sent to the admin. They will respond to your email shortly.",
        confirmButtonColor: "#C97C2C",
      });

      // Reset form
      setMessageData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Send",
        text: error.response?.data?.detail || "Unable to send your message. Please try again or contact the admin directly via email.",
        confirmButtonColor: "#C97C2C",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="relative min-h-screen font-sans overflow-x-hidden page-surface"
      style={{ color: "#1e2329", backgroundColor: "#fffaf3" }}
    >
      <style>{`
  :root{
    --amber1:#fff7ec; --amber2:#ffe7c8; --amber3:#ffd6a1; --amber4:#f3c27e;
    --amber5:#e59b50; --amber6:#c97c2c; --coffee:#6f4a23; --coffee2:#7a5a34;

    /* Fluid tokens (match Home.jsx) */
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

  /* Background */
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

  /* Orbs */
  .orb{position:fixed; border-radius:50%; filter:blur(36px); mix-blend-mode:multiply; opacity:.28; z-index:-10; animation:orbFloat 18s ease-in-out infinite;}
  .orb.one{width:min(36vw,360px);height:min(36vw,360px);background:radial-gradient(circle at 30% 30%,#ffd9aa,transparent 60%);left:-8%;top:18%}
  .orb.two{width:min(42vw,420px);height:min(42vw,420px);background:radial-gradient(circle at 70% 40%,#ffc985,transparent 55%);right:-10%;top:8%;animation-delay:2s}
  .orb.three{width:min(32vw,320px);height:min(32vw,320px);background:radial-gradient(circle at 50% 60%,#ffdfb8,transparent 58%);left:6%;bottom:12%;animation-delay:4s}
  @keyframes orbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-28px)}}

  /* Glass */
  .glass{backdrop-filter: blur(12px); background: linear-gradient(180deg, rgba(255,255,255,.72), rgba(255,255,255,.52)); border:1px solid rgba(255,255,255,.7)}
  .glass-soft{backdrop-filter: blur(10px); background: linear-gradient(180deg, rgba(255,255,255,.66), rgba(255,255,255,.46)); border:1px solid rgba(255,255,255,.65)}

  /* Header (match Home) */
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
  .sticky-boost{transition: box-shadow .25s ease, backdrop-filter .25s ease; border-bottom:1px solid rgba(201,124,44,.14)}
  .sticky-boost.is-scrolled{box-shadow: 0 10px 28px rgba(201,124,44,.18)}

  /* Brand shimmer */
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

  /* Fluid helpers (match Home) */
  .hdr-pad{ padding-inline: var(--space-3) !important; padding-block: calc(var(--space-2) * .9) !important; }
  .hdr-spacer{ height: var(--hdr-h) !important; }
  .card-pad{ padding: var(--space-3) !important; border-radius: var(--radius) !important; }
`}</style>

      {/* Background */}
      <div className="bg-orbit" />
      <span className="orb one" />
      <span className="orb two" />
      <span className="orb three" />

      {/* Header with Back button */}
      <header className="fixed top-0 left-0 right-0 z-[80]">
        <div className="glass-soft header-skin sticky-boost header-gradient-line">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between hdr-pad">
            <div className="flex items-center gap-3 select-none">
              <img
                src="/images/DoughNationLogo.png"
                alt="DoughNation logo"
                className="object-contain logo-bread"
                style={{ width: 28, height: 28 }}
              />
              <span
                className="font-extrabold brand-pop"
                style={{ fontSize: "clamp(1.15rem, 1rem + 1vw, 1.6rem)" }}
              >
                DoughNation
              </span>
            </div>

            <Link
              to="/"
              className="rounded-full text-white font-semibold btn-shimmer hover:shadow-lg hover:shadow-amber-300/30 transition-transform active:scale-[.98]"
              style={{
                padding:
                  "clamp(.55rem, .4rem + .5vw, .85rem) clamp(1rem, .8rem + 1.2vw, 1.4rem)",
                borderRadius: 9999,
              }}
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>
      <div aria-hidden="true" className="hdr-spacer" />

      {/* Body */}
      <main
        className="max-w-6xl mx-auto px-4 sm:px-6"
        style={{ paddingBlock: "var(--space-4)" }}
      >
        <header className="text-center">
          <h1
            className="font-extrabold title-grad"
            style={{ fontSize: "var(--title-lg)" }}
          >
            Contact Support
          </h1>
          <p
            className="mt-2"
            style={{ color: "#6b4d2e", fontSize: "var(--text)" }}
          >
            Reach out to our admin or any member of the DoughNation developer
            team for help.
          </p>
        </header>

        {/* Contact Cards */}
        <section className="mt-8 grid gap-6">
          {/* Combined Admin Contact & Message Box */}
          <div className="glass rounded-2xl card-pad">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Message Form */}
              <div className="lg:col-span-2">
                <h2
                  className="font-semibold"
                  style={{ color: "var(--coffee)", fontSize: "var(--title-sm)" }}
                >
                  Send a Message to Admin
                </h2>
                <p
                  className="mt-2 mb-4"
                  style={{ color: "var(--coffee2)", fontSize: "var(--text)" }}
                >
                  Can't access your account? Need help? Send a message directly to our admin.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium mb-1"
                      style={{ color: "var(--coffee)" }}
                    >
                      Your Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={messageData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      style={{ fontSize: "var(--text)" }}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium mb-1"
                      style={{ color: "var(--coffee)" }}
                    >
                      Your Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={messageData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      style={{ fontSize: "var(--text)" }}
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="subject"
                      className="block text-sm font-medium mb-1"
                      style={{ color: "var(--coffee)" }}
                    >
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      required
                      value={messageData.subject}
                      onChange={(e) => handleInputChange("subject", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      style={{ fontSize: "var(--text)" }}
                      placeholder="e.g., Cannot access my account"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium mb-1"
                      style={{ color: "var(--coffee)" }}
                    >
                      Message
                    </label>
                    <textarea
                      id="message"
                      required
                      rows="5"
                      value={messageData.message}
                      onChange={(e) => handleInputChange("message", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                      style={{ fontSize: "var(--text)" }}
                      placeholder="Describe your issue or question in detail..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSending}
                    className="w-full rounded-lg text-white font-semibold btn-shimmer hover:shadow-lg hover:shadow-amber-300/30 transition-transform active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      padding: "clamp(.65rem, .5rem + .5vw, .95rem)",
                    }}
                  >
                    {isSending ? "Sending..." : "Send Message"}
                  </button>
                </form>
              </div>

              {/* Admin Info */}
              <div className="lg:col-span-1 lg:border-l lg:border-amber-200 lg:pl-6">
                <h3
                  className="font-semibold"
                  style={{ color: "var(--coffee)", fontSize: "var(--title-sm)" }}
                >
                  Admin Contact
                </h3>
                <p
                  className="mt-2 text-sm"
                  style={{ color: "var(--coffee2)", fontSize: "var(--text)" }}
                >
                  For urgent matters, you can also contact our admin directly:
                </p>
                <div className="mt-4">
                  <p className="text-sm font-medium" style={{ color: "var(--coffee)" }}>
                    Email:
                  </p>
                  <a
                    href="mailto:doughnation04@gmail.com"
                    className="mt-2 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium btn-shimmer text-white hover:shadow-lg hover:shadow-amber-300/30 transition-transform active:scale-[.98]"
                    style={{ borderRadius: 9999 }}
                  >
                    doughnation04@gmail.com
                  </a>
                </div>

                {/* Developers Info */}
                <div className="mt-6 pt-6 border-t border-amber-200">
                  <h3
                    className="font-semibold"
                    style={{ color: "var(--coffee)", fontSize: "var(--title-sm)" }}
                  >
                    DoughNation Developers
                  </h3>
                  <p
                    className="mt-2 text-sm"
                    style={{ color: "var(--coffee2)", fontSize: "var(--text)" }}
                  >
                    You can also reach our development team for feedback, feature requests, or technical questions.
                  </p>
                  <ul className="mt-4 space-y-3 text-sm">
                    <li>
                      <p className="font-medium" style={{ color: "var(--coffee)" }}>
                        1. Christian John A. Hipolito
                      </p>
                      <a
                        href="mailto:jnistianhipolitov7@gmail.com"
                        className="text-xs break-all hover:underline"
                        style={{ color: "#c97c2c" }}
                      >
                        jnistianhipolitov7@gmail.com
                      </a>
                    </li>
                    <li>
                      <p className="font-medium" style={{ color: "var(--coffee)" }}>
                        2. Syranne Jahziel M. Maestro
                      </p>
                      <a
                        href="mailto:smaestro.college@gmail.com"
                        className="text-xs break-all hover:underline"
                        style={{ color: "#c97c2c" }}
                      >
                        smaestro.college@gmail.com
                      </a>
                    </li>
                    <li>
                      <p className="font-medium" style={{ color: "var(--coffee)" }}>
                        3. Justin Paul P. Morada
                      </p>
                      <a
                        href="mailto:justinpaulmorada969@gmail.com"
                        className="text-xs break-all hover:underline"
                        style={{ color: "#c97c2c" }}
                      >
                        justinpaulmorada969@gmail.com
                      </a>
                    </li>
                    <li>
                      <p className="font-medium" style={{ color: "var(--coffee)" }}>
                        4. Irish Reignette I. Valmadrid
                      </p>
                      <a
                        href="mailto:irishreignette@gmail.com"
                        className="text-xs break-all hover:underline"
                        style={{ color: "#c97c2c" }}
                      >
                        irishreignette@gmail.com
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Small note for users */}
        <p
          className="mt-6 text-center"
          style={{ color: "#7a5a34", fontSize: "0.85rem" }}
        >
          We aim to respond as soon as possible. For time-sensitive issues, we
          recommend contacting the admin email first.
        </p>
      </main>
    </div>
  );
};

export default ContactSupport;