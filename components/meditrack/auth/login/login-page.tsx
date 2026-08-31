"use client";

import Image from "next/image";
import { Plus, ShieldCheck } from "lucide-react";
import { MediTrackLoginForm } from "./meditrack-login-form";

/** MediTrack's own branded login screen — split hero panel (left, dark,
 * matching the Administration Register's sidebar) + login card (right,
 * cream, matching its content area). Same Archivo + IBM Plex Mono
 * typography, olive accent, square corners, no drop shadow as the rest of
 * the register design system. Assets live in public/images
 * (left-image-background.png, left-image-icon.png). */
export function MediTrackLoginPage() {
  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-adminreg-bg font-archivo">
      {/* min-h-0 lets this row actually shrink to its flex-1 share of the
       * screen instead of growing to fit the taller of its two children (the
       * hero illustration) — without it the whole page grows past 100vh and
       * the form ends up rendered near the top of that taller page instead
       * of centered in the visible viewport. */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Left — brand & illustration panel, matches the sidebar. Purely
         * decorative, so on a short viewport it's allowed to crop evenly
         * top/bottom (overflow-hidden) rather than scroll — combined with
         * `justify-center`, overflow-y-auto here would center the content
         * first and only let you scroll to the bottom half, permanently
         * clipping the top half with no way to reach it. The illustration
         * itself is sized per breakpoint so it never forces this panel
         * taller than a typical viewport (see the image wrapper below). */}
        <div className="relative hidden w-full flex-col justify-center overflow-hidden bg-adminreg-sidebar px-8 py-6 md:flex md:w-1/2 lg:px-16 lg:py-8">
          <Image
            src="/images/left-image-background.png"
            alt=""
            fill
            priority
            className="pointer-events-none object-cover opacity-10"
          />

          <div className="relative z-10 mx-auto w-full max-w-md text-center">
            <div className="flex items-center justify-center gap-2.5">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-none bg-adminreg-olive">
                <Plus className="h-5 w-5 text-adminreg-card" strokeWidth={3} />
              </div>
              <div className="text-left leading-tight">
                <p className="text-xl font-extrabold text-adminreg-sidebar-text">MediTrack</p>
                <p className="font-plexmono text-[10px] uppercase tracking-[0.1em] text-adminreg-sidebar-text-muted">Hospital Management System</p>
              </div>
            </div>

            <h1 className="mt-5 text-2xl font-extrabold leading-tight tracking-[-0.01em] text-adminreg-sidebar-text lg:text-3xl">
              Empowering Healthcare,
              <br />
              <span className="text-adminreg-olive">Elevating Lives</span>
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm text-adminreg-sidebar-text-secondary">
              A complete hospital management solution to streamline operations and deliver better patient care.
            </p>

            {/* Scales with the panel instead of a single fixed size — at its
             * native 2:3 aspect ratio, a naive max-w-[340px] renders 510px
             * tall, which alone is taller than the content area on a
             * typical laptop screen and pushes the logo above the top edge.
             * Kept compact at md (smallest window this panel ever renders
             * in) and only grows on genuinely spacious screens. */}
            <div className="relative mx-auto mt-4 aspect-[2/3] w-full max-w-[130px] md:max-w-[150px] lg:max-w-[200px] xl:max-w-[240px]">
              <Image src="/images/left-image-icon.png" alt="MediTrack — secure hospital care illustration" fill className="object-contain" priority />
            </div>
          </div>
        </div>

        {/* Right — login card */}
        <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-y-auto px-4 py-8 sm:py-12 md:w-1/2">
          <div className="w-full max-w-[480px]">
            <div className="mb-6 flex flex-col items-center gap-2 text-center md:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-none bg-adminreg-olive">
                <Plus className="h-5 w-5 text-adminreg-card" strokeWidth={3} />
              </div>
              <p className="text-lg font-extrabold text-adminreg-text">MediTrack</p>
            </div>

            <div className="border border-adminreg-border bg-adminreg-card p-5 sm:p-8">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-extrabold tracking-[-0.01em] text-adminreg-text">Welcome Back!</h2>
                <p className="mt-1 text-sm text-adminreg-muted">
                  Sign in to continue to <span className="font-semibold text-adminreg-olive">MediTrack</span>
                </p>
              </div>

              <MediTrackLoginForm />
            </div>

            <p className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center font-plexmono text-[11px] uppercase tracking-wide text-adminreg-muted">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-adminreg-olive" />
                Secure
              </span>
              <span aria-hidden>·</span>
              Reliable
              <span aria-hidden>·</span>
              Smart Healthcare
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
