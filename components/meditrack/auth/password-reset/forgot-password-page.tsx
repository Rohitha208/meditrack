"use client";

import { PasswordResetFlow } from "@/components/pawtrack/auth/password-reset/PasswordResetFlow";

export function MediTrackForgotPasswordPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
      }}
    >
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center text-white space-y-1">
          <h1 className="text-2xl font-bold">MediTrack</h1>
          <p className="text-sm text-white/70">Reset your account password</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full p-8">
          <PasswordResetFlow hideLogo />
        </div>
      </div>
    </div>
  );
}
