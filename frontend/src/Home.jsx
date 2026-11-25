import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  Menu,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  SlidersHorizontal,
  Download,
} from "lucide-react";
import { Brand, ToolSearch, Compare, Dialog } from "./shared";
import sampleDiagnosis from "./sample-diagnosis.json";
import { academicTitle, tools, features, modes } from "./tools";

export default function Home() {
  const [mode, setMode] = useState(0),
    [modal, setModal] = useState(""),
    [nav, setNav] = useState(false);
  const section = useRef(null),
    reduce = useReducedMotion();
  const selected = tools[modes[mode]],
    SelectedIcon = selected.icon;
  const go = () => setNav(false);
  useEffect(() => {
    document.title = "RestorePix — Bring Every Photo Back to Life";
  }, []);
  return (
    <main className="home">
      <section className="hero" id="home">
        <img
          className="heroPhoto"
          src="/assets/hero.webp"
          alt=""
          fetchPriority="high"
        />
        <div className="heroShade" />
        <header className="homebar shell">
          <Brand />
          <nav
            className={nav ? "mainnav open" : "mainnav"}
            aria-label="Main navigation"
          >
            <a className="active" href="#home" onClick={go}>
              Home
            </a>
            <a href="#features" onClick={go}>
              Features
            </a>
            <a href="#how" onClick={go}>
              How It Works
            </a>
            <Link to="/studio">Photo Studio</Link>
            <button
              onClick={() => {
                go();
                setModal("about");
              }}
            >
              About
            </button>
          </nav>
          <div className="navActions">
            <button
              className="searchBtn"
              aria-label="Search photo tools"
              onClick={() => setModal("search")}
            >
              <Search />
            </button>
            <Link to="/studio" className="pill navPill">
              Get Started <ArrowRight />
            </Link>
            <button
              className="mobileNav"
              aria-label="Toggle menu"
              aria-expanded={nav}
              onClick={() => setNav(!nav)}
            >
              <Menu />
            </button>
          </div>
        </header>
        <motion.div
          className="heroCopy shell"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <span className="heroEyebrow">
            <Sparkles /> OpenCV photo restoration studio
          </span>
          <h1>
            Bring Every Photo
            <br />
            <span>Back to Life.</span>
          </h1>
          <p>
            Restore cherished memories, enhance every detail, and rediscover the
            beauty in your photographs.
          </p>
          <div className="heroActions">
            <Link to={"/studio?tool=" + modes[mode]} className="pill primary">
              Start Restoring <ArrowRight />
            </Link>
            <a href="#features" className="explore">
              <i>
                <svg
                  viewBox="0 0 10 12"
                  width="10"
                  height="12"
                  fill="currentColor"
                >
                  <path d="M1 1 9 6 1 11Z" />
                </svg>
              </i>
              Explore Features
            </a>
          </div>
        </motion.div>
        <Link to={"/studio?tool=" + modes[mode]} className="glassCard">
          <i>
            <SelectedIcon />
          </i>
          <span>
            <strong>{selected.label}</strong>
            <small>
              {
                [
                  "Restore faded tones. Preserve the original.",
                  "Bring light back to shadowed details.",
                  "Soften grain. Keep natural textures.",
                  "Resize with bicubic or Lanczos.",
                ][mode]
              }
            </small>
          </span>
          <b>
            <ArrowRight />
          </b>
        </Link>
        <div className="heroFoot shell">
          <div className="heroModes">
            {modes.map((key, i) => {
              const t = tools[key];
              return (
                <button
                  className={mode === i ? "mode selected" : "mode"}
                  key={key}
                  aria-pressed={mode === i}
                  onClick={() => setMode(i)}
                >
                  <i>
                    <t.icon />
                  </i>
                  <span>
                    <strong>{t.short}</strong>
                    <small>{t.caption}</small>
                  </span>
                </button>
              );
            })}
          </div>
          <button
            className="progressMode"
            onClick={() => setMode((mode + 1) % 4)}
            aria-label="Show next restoration feature"
          >
            <strong>0{mode + 1}</strong>
            <span>
              <i style={{ left: mode * 25 + "%" }} />
            </span>
            04
          </button>
        </div>
      </section>
      <section id="features" className="featureSection">
        <div className="sectionhead">
          <h2>
            Your photo, <em>refined.</em>
          </h2>
          <p>Choose a tool to start working on your photograph.</p>
        </div>
        <div className="featureReel" ref={section}>
          {features.map((k) => {
            const t = tools[k];
            return (
              <Link to={"/studio?tool=" + k} key={k} className="featureCard">
                <img src={"/assets/" + k + ".webp"} loading="lazy" alt="" />
                <div>
                  <h3>{t.label}</h3>
                  <p>{t.detail}</p>
                  <span>
                    Open tool <ArrowUpRight size={16} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
        <div className="reelControls">
          {[-1, 1].map((dir) => (
            <button
              key={dir}
              className="iconButton"
              aria-label={dir < 0 ? "Previous tools" : "Next tools"}
              onClick={() =>
                section.current.scrollBy({
                  left: dir * 300,
                  behavior: reduce ? "instant" : "smooth",
                })
              }
            >
              {dir < 0 ? <ChevronLeft /> : <ChevronRight />}
            </button>
          ))}
        </div>
      </section>
      <section className="examples shell" id="compare">
        <div>
          <h2>
            See the light
            <br />
            <em>return.</em>
          </h2>
          <p>
            Drag across this photograph to compare the darkened input with its
            OpenCV low-light correction.
          </p>
          <Link className="darkpill" to="/studio?sample=1&tool=light">
            Try this photo <ArrowRight size={16} />
          </Link>
        </div>
        <Compare
          before="/assets/sample-before.jpg"
          after="/assets/sample-after.jpg"
        />
      </section>
      <section className="diagnosisShowcase shell">
        <div>
          <h2>Read the light.</h2>
          <p>
            Photo Diagnosis measures brightness, contrast, and edge sharpness
            before you edit. These readings come from the darkened coffee
            photograph above.
          </p>
          <Link to="/studio?sample=1&tool=light">
            Inspect the sample <ArrowRight size={15} />
          </Link>
        </div>
        <div className="sampleReadings">
          <div
            className="histogram"
            role="img"
            aria-label="Luminance distribution of the original coffee sample"
          >
            {sampleDiagnosis.histogram.map((v, i) => (
              <i
                key={i}
                style={{
                  height:
                    Math.max(
                      1,
                      (100 * v) / Math.max(...sampleDiagnosis.histogram),
                    ) + "%",
                }}
              />
            ))}
          </div>
          <dl>
            {[
              ["Mean luminance", sampleDiagnosis.brightness],
              ["Contrast", sampleDiagnosis.contrast],
              ["Laplacian variance", sampleDiagnosis.sharpness],
            ].map(([label, v]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <section className="how shell" id="how">
        <h2>How it works</h2>
        <div>
          {[
            [
              ImageIcon,
              "Upload your photo",
              "Open a JPG, PNG, or WebP image in Photo Studio.",
            ],
            [
              SlidersHorizontal,
              "Enhance & restore",
              "Check brightness, contrast, and sharpness. Choose a tool and adjust its settings.",
            ],
            [
              Download,
              "Compare & download",
              "Inspect the before and after, then save the result as a PNG.",
            ],
          ].map(([Icon, title, body]) => (
            <article key={title}>
              <Icon />
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>
      <footer className="homeFooter">
        <Brand />
        <Link className="pill" to="/studio">
          Open Photo Studio <ArrowRight size={16} />
        </Link>
      </footer>
      {modal === "search" && <ToolSearch onClose={() => setModal("")} />}
      {modal === "about" && (
        <Dialog title="About RestorePix" onClose={() => setModal("")}>
          <p>
            RestorePix is a university digital image processing project. Its
            tools use OpenCV to adjust and repair photographs while preserving
            their original character.
          </p>
          <h3>Research title</h3>
          <p lang="id">{academicTitle}</p>
        </Dialog>
      )}
    </main>
  );
}
