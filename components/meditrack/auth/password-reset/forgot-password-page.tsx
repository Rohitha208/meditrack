"use client";

import Image from "next/image";
import { Plus, ShieldCheck } from "lucide-react";
import { MediTrackForgotPasswordForm } from "./meditrack-forgot-password-form";

/** MediTrack's own branded forgot-password screen — same split hero panel
 * (left, dark, matching the Administration Register's sidebar) + card
 * (right, cream) layout as MediTrackLoginPage, so the two auth screens read
 * as one continuous flow instead of two different products. */
export function MediTrackForgotPasswordPage() {
  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-adminreg-bg font-archivo">
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Left — brand & illustration panel, identical to the login page. */}
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

            <div className="relative mx-auto mt-4 aspect-[2/3] w-full max-w-[130px] md:max-w-[150px] lg:max-w-[200px] xl:max-w-[240px]">
              <Image src="/images/left-image-icon.png" alt="MediTrack — secure hospital care illustration" fill className="object-contain" priority />
            </div>
          </div>
        </div>

        {/* Right — forgot-password card */}
        <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-y-auto px-4 py-8 sm:py-12 md:w-1/2">
          <div className="w-full max-w-[480px]">
            <div className="mb-6 flex flex-col items-center gap-2 text-center md:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-none bg-adminreg-olive">
                <Plus className="h-5 w-5 text-adminreg-card" strokeWidth={3} />
              </div>
              <p className="text-lg font-extrabold text-adminreg-text">MediTrack</p>
            </div>

            <div className="border border-adminreg-border bg-adminreg-card p-5 sm:p-8">
              <MediTrackForgotPasswordForm />
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
