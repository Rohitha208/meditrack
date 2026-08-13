"use client";

import Image from "next/image";
import { Plus, ShieldCheck } from "lucide-react";
import { MediTrackLoginForm } from "./meditrack-login-form";

/** MediTrack's own branded login screen — split hero panel (left) + login
 * card (right), matching the approved MediTrack mockup. The watermark
 * pattern is one continuous full-bleed background behind both panels (not
 * confined to the left half), same as the mockup. Assets live in
 * public/images (left-image-background.png, left-image-icon.png). */
export function MediTrackLoginPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white dark:bg-slate-950">
      {/* Full-width watermark background, shared by both panels */}
      <Image
        src="/images/left-image-background.png"
        alt=""
        fill
        priority
        className="pointer-events-none object-cover opacity-100 dark:opacity-10"
      />
      {/* Soft color blobs, matching the mockup's ambient glow behind the card */}
      <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl dark:bg-indigo-500/10" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-brand-200/40 blur-3xl dark:bg-brand-500/10" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="flex flex-1 flex-col md:flex-row">
          {/* Left — brand & illustration panel */}
          <div className="hidden w-full flex-col justify-center px-10 py-12 md:flex md:w-1/2 lg:px-20">
            <div className="mx-auto w-full max-w-md text-center">
              <div className="flex items-center justify-center gap-2.5">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border-2 border-brand-500 bg-white shadow-sm dark:bg-slate-900">
                  <Plus className="h-5 w-5 text-brand-600" strokeWidth={3} />
                </div>
                <div className="text-left leading-tight">
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white">
                    Medi<span className="text-brand-600 dark:text-brand-400">Track</span>
                  </p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Hospital Management System</p>
                </div>
              </div>

              <h1 className="mt-8 text-3xl font-bold leading-tight text-slate-900 lg:text-4xl dark:text-white">
                Empowering Healthcare,
                <br />
                <span className="text-brand-600 dark:text-brand-400">Elevating Lives</span>
              </h1>
              <p className="mx-auto mt-4 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                A complete hospital management solution to streamline operations and deliver better patient care.
              </p>

              <div className="relative mx-auto mt-6 aspect-[2/3] w-full max-w-[340px]">
                <Image src="/images/left-image-icon.png" alt="MediTrack — secure hospital care illustration" fill className="object-contain" priority />
              </div>
            </div>
          </div>

          {/* Right — login card */}
          <div className="flex w-full flex-1 items-center justify-center px-4 py-12 md:w-1/2">
            <div className="w-full max-w-[480px]">
              <div className="mb-6 flex flex-col items-center gap-2 text-center md:hidden">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-brand-500 bg-white shadow-sm dark:bg-slate-900">
                  <Plus className="h-5 w-5 text-brand-600" strokeWidth={3} />
                </div>
                <p className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Medi<span className="text-brand-600 dark:text-brand-400">Track</span>
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                <div className="mb-6 text-center">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome Back!</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Sign in to continue to <span className="font-semibold text-brand-600 dark:text-brand-400">MediTrack</span>
                  </p>
                </div>

                <MediTrackLoginForm />
              </div>

              <p className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs text-slate-400 dark:text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand-500" />
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

        <p className="pb-6 text-center text-xs text-slate-400 dark:text-slate-600">© 2026 MediTrack. All rights reserved.</p>
      </div>
    </div>
  );
}
