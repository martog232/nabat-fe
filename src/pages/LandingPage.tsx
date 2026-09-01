import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '../components/common/ThemeToggle'
import { useIsDesktop, useMediaQuery } from '../hooks/useMediaQuery'

/**
 * What a visitor sees before signing in.
 *
 * <p>`/` used to be the map behind {@code ProtectedRoute}, so anyone arriving without an
 * account was bounced to a login form that explained nothing about what they were logging in
 * to. The map now lives at `/map`, and a signed-in visitor is redirected there — the route a
 * person types stays the route they expect, and the one they land on depends on whether the
 * app has anything to show them yet.
 *
 * <p>Everything claimed below is something the application does. There are no figures, no
 * testimonials and no coverage map, because inventing them is how a product page starts
 * lying.
 */
export function LandingPage() {
  return (
    <div className="h-full overflow-y-auto bg-surface-DEFAULT">
      {/* Header and hero share one dark panel because the video sits behind both. This header
          belongs to this page alone, so dressing it for a dark backdrop costs nothing
          elsewhere. `bg-slate-950` is what shows when there is no video — a dark hero, not a
          broken one. */}
      <div className="relative isolate overflow-hidden bg-slate-950">
        <HeroVideo />

        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] sm:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 shadow-lg shadow-brand-600/30">
              <PinGlyph className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">Nabat</span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle className="text-white/80 hover:text-white" />
            <Link
              to="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-brand-600/20 transition-colors hover:bg-brand-700"
            >
              Get started
            </Link>
          </div>
        </header>

        <section className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-8 sm:pb-32 sm:pt-24">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
            </span>
            Live alerts from people nearby
          </p>

          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-6xl">
            Know what is happening
            <span className="text-brand-500"> around you</span>, as it happens.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
            Nabat is a safety map built by the people on it. Someone reports a hazard, a road closure
            or an incident; everyone close enough to care hears about it within seconds, and the
            people who are there decide whether it holds up.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-7 py-3.5 text-base font-semibold text-white shadow-xl shadow-brand-600/25 transition-colors hover:bg-brand-700"
            >
              Create an account
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/10 px-7 py-3.5 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              I already have one
            </Link>
          </div>
        </section>
      </div>

      <main className="mx-auto max-w-6xl px-4 pt-16 sm:px-8 sm:pt-24">
        <section className="grid gap-5 pb-16 sm:grid-cols-3 sm:pb-24">
          <Feature
            title="A map, not a feed"
            body="Every alert is a place first. Open the map and see what is active around you, filtered by type and severity."
            icon={
              <path
                d="M9 20l-5.5 2.5V6L9 3.5m0 16.5l6-3m-6 3V3.5m6 13.5l5.5 2.5V4L15 6.5m0 10.5V6.5m0 0L9 3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            }
          />
          <Feature
            title="Checked by the people there"
            body="Anyone can report. Everyone else can confirm or dispute, and the credibility score follows those votes rather than whoever shouted first."
            icon={
              <>
                <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                <path
                  d="M12 3l7.5 3v6c0 4.5-3 8.2-7.5 9.5C7.5 20.2 4.5 16.5 4.5 12V6L12 3z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            }
          />
          <Feature
            title="Your radius, your business"
            body="Choose how far you care about — 1 km if you want your street, 50 km if you want the region. Nothing outside it reaches you."
            icon={
              <>
                <circle cx="12" cy="12" r="3" />
                <circle cx="12" cy="12" r="8.5" strokeDasharray="3 3" />
              </>
            }
          />
        </section>

        <section className="pb-16 sm:pb-24">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            How it works
          </h2>

          <ol className="mt-8 grid gap-8 sm:grid-cols-3">
            <Step
              number={1}
              title="Report what you see"
              body="Drop it on the map, pick a type and a severity, add a photo if you have one."
            />
            <Step
              number={2}
              title="Neighbours weigh in"
              body="People nearby confirm it, dispute it, or say nothing — and the alert's credibility moves with them."
            />
            <Step
              number={3}
              title="Everyone close finds out"
              body="Anyone within their chosen radius is notified while it still matters, on the map and in their notifications."
            />
          </ol>
        </section>

        <section className="mb-16 rounded-3xl border border-surface-border bg-surface-card px-6 py-12 text-center shadow-sm sm:mb-24 sm:px-12">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Start with the street you live on.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-400">
            An account takes an email and a password. You choose your radius afterwards, and you can
            change it whenever you like.
          </p>
          <Link
            to="/register"
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-brand-600 px-7 py-3.5 text-base font-semibold text-white shadow-xl shadow-brand-600/25 transition-colors hover:bg-brand-700"
          >
            Create an account
          </Link>
        </section>
      </main>

      <footer className="border-t border-surface-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] text-sm text-slate-500 sm:flex-row sm:px-8 dark:text-slate-400">
          <span>Nabat — real-time safety alerts</span>
          <span className="flex items-center gap-4">
            <Link to="/login" className="transition-colors hover:text-slate-800 dark:hover:text-slate-200">
              Sign in
            </Link>
            <Link to="/register" className="transition-colors hover:text-slate-800 dark:hover:text-slate-200">
              Create an account
            </Link>
          </span>
        </div>
      </footer>
    </div>
  )
}

interface FeatureProps {
  title: string
  body: string
  icon: React.ReactNode
}

function Feature({ title, body, icon }: FeatureProps) {
  return (
    <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-sm">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600/10 text-brand-600 dark:text-brand-400">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden>
          {icon}
        </svg>
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{body}</p>
    </div>
  )
}

function Step({ number, title, body }: { number: number; title: string; body: string }) {
  return (
    <li className="relative">
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-surface-border bg-surface-elevated text-sm font-semibold text-brand-600 dark:text-brand-400">
        {number}
      </span>
      <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{body}</p>
    </li>
  )
}

/**
 * The moving backdrop behind the header and the hero.
 *
 * <p>Decorative, so it is muted, loops, carries no controls and is hidden from assistive
 * technology — and because it is decorative, it is allowed to be absent. The panel behind it
 * is a solid dark colour, so a missing file, a codec the browser will not play or a phone
 * that never loads it all end at the same place: a dark hero rather than a broken one.
 *
 * <p>Three reasons it may not play, each deliberate:
 * <ul>
 *   <li><b>Reduced motion.</b> Someone who has asked the system for less movement is not
 *       asking for an exception for the parts we happen to find nice.</li>
 *   <li><b>Phones.</b> A background video is megabytes of somebody's mobile data for
 *       decoration, on the screen where it is least visible behind the text.</li>
 *   <li><b>It failed to load.</b> {@code onError} takes it out rather than leaving a black
 *       rectangle where the poster should be.</li>
 * </ul>
 *
 * <p><b>The files.</b> {@code public/hero.mp4}, and optionally {@code public/hero-poster.jpg}
 * for the frame shown while it buffers. Neither is in the repository — a hero video is
 * somebody's footage with somebody's licence, and committing one found on the internet is how
 * that becomes a problem later. Drop them in and this starts playing; leave them out and the
 * page still works.
 */
function HeroVideo() {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isDesktop = useIsDesktop()
  const [failed, setFailed] = useState(false)

  return (
    <>
      {isDesktop && !prefersReducedMotion && !failed && (
        <video
          className="absolute inset-0 -z-10 h-full w-full object-cover"
          // src on the element, not a <source> child: a child that fails does not reliably
          // fire onError on the video, and the fallback would never come.
          src="/hero.mp4"
          poster="/hero-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
          onError={() => setFailed(true)}
        />
      )}

      {/* The scrim. Text over video is unreadable without one, and it darkens towards the
          bottom so the panel meets the page background instead of ending at a hard edge. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/70 via-slate-950/60 to-slate-950"
      />
    </>
  )
}

function PinGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  )
}
