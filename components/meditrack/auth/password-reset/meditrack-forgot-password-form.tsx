"use client"

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ClipboardEvent } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { AdminButton } from "@/components/meditrack/admin/register"
import { useRequestResetPasswordMutation } from "@/queries/auth/request-reset-password"
import { useVerifyResetOtpMutation } from "@/queries/auth/verify-reset-otp"
import { useResetPasswordMutation } from "@/queries/auth/reset-password"
import { useToast } from "@/hooks/use-toast"

const FIELD_LABEL = "block font-plexmono text-[10px] uppercase tracking-[0.04em] text-adminreg-muted2"
const FIELD_CLASS = "h-11 rounded-none border-adminreg-border bg-adminreg-bg font-archivo text-sm text-adminreg-text placeholder:text-adminreg-muted focus-visible:ring-1 focus-visible:ring-adminreg-olive"

type Step = 1 | 2 | 3 | 4

const STEP_COPY: Record<Step, { title: string; subtitle: string }> = {
  1: { title: "Reset your password", subtitle: "Enter your email to receive a verification code" },
  2: { title: "Verify your identity", subtitle: "Enter the 6-digit code sent to your email" },
  3: { title: "Set new password", subtitle: "Create a secure new password for your account" },
  4: { title: "Password reset successful!", subtitle: "Your password has been changed. You can now log in with your new password." },
}

/**
 * MediTrack's own forgot-password flow — same email → OTP → new-password →
 * success steps and mutations as PawTrack's shared PasswordResetFlow, but
 * restyled to the Administration Register's palette (square corners,
 * Archivo + IBM Plex Mono, olive accent, no drop shadow), matching
 * MediTrackLoginForm's convention of not reusing PawTrack's generic
 * (blue-accented) auth components.
 */
export function MediTrackForgotPasswordForm() {
  const { toast } = useToast()
  const [step, setStep] = useState<Step>(1)
  const [email, setEmail] = useState("")
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""])
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [verifiedEmail, setVerifiedEmail] = useState("")

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  useEffect(() => {
    setOtp(otpDigits.join(""))
  }, [otpDigits])

  function validateEmail() {
    if (!email) return "Email is required"
    if (!/^\S+@\S+\.\S+$/.test(email)) return "Invalid email format"
    return ""
  }

  function validateOtp() {
    if (!otp) return "OTP code is required"
    if (!/^\d{6}$/.test(otp)) return "OTP must be 6 digits"
    return ""
  }

  function validatePassword() {
    if (!newPassword) return "New password is required"
    if (newPassword.length < 8) return "Password must be at least 8 characters"
    if (newPassword !== confirmPassword) return "Passwords do not match"
    return ""
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...otpDigits]
    next[index] = value.slice(-1)
    setOtpDigits(next)
    if (value && index < 5) inputRefs[index + 1]?.current?.focus()
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) inputRefs[index - 1]?.current?.focus()
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/[^\d]/g, "").slice(0, 6)
    const next = [...otpDigits]
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setOtpDigits(next)
    const nextEmptyIndex = next.findIndex((d) => !d)
    inputRefs[nextEmptyIndex !== -1 ? nextEmptyIndex : 5].current?.focus()
  }

  const requestResetMutation = useRequestResetPasswordMutation({
    onSuccess: () => {
      toast({ title: "OTP sent!", description: "A verification code has been sent to your email", duration: 3000 })
      setVerifiedEmail(email)
      setStep(2)
      setTimeout(() => inputRefs[0].current?.focus(), 100)
    },
    onError: (err: any) => setError(err?.message || "Failed to send reset code"),
  })

  const verifyOtpMutation = useVerifyResetOtpMutation({
    onSuccess: () => {
      toast({ title: "OTP verified!", description: "Please set your new password", duration: 3000 })
      setStep(3)
    },
    onError: (err: any) => setError(err?.message || "Invalid verification code"),
  })

  const resetPasswordMutation = useResetPasswordMutation({
    onSuccess: () => {
      toast({ title: "Success!", description: "Your password has been reset successfully", duration: 3000 })
      setStep(4)
    },
    onError: (err: any) => setError(err?.message || "Failed to reset password"),
  })

  function handleRequestReset(e: FormEvent) {
    e.preventDefault()
    const err = validateEmail()
    if (err) return setError(err)
    setError("")
    requestResetMutation.mutate({ email })
  }

  function handleVerifyOtp(e: FormEvent) {
    e.preventDefault()
    const err = validateOtp()
    if (err) return setError(err)
    setError("")
    verifyOtpMutation.mutate({ email: verifiedEmail || email, otp })
  }

  function handleResetPassword(e: FormEvent) {
    e.preventDefault()
    const err = validatePassword()
    if (err) return setError(err)
    setError("")
    resetPasswordMutation.mutate({ email: verifiedEmail || email, otp, newPassword })
  }

  function handleResendOtp() {
    if (requestResetMutation.isPending) return
    setOtpDigits(["", "", "", "", "", ""])
    requestResetMutation.mutate({ email: verifiedEmail || email })
  }

  return (
    <div className="font-archivo">
      {step < 4 && (
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-extrabold tracking-[-0.01em] text-adminreg-text">{STEP_COPY[step].title}</h2>
          <p className="mt-1 text-sm text-adminreg-muted">{STEP_COPY[step].subtitle}</p>
        </div>
      )}

      {error && (
        <div className="mb-5 border border-adminreg-red bg-adminreg-red-soft px-3.5 py-2.5 text-sm text-adminreg-red-text">{error}</div>
      )}

      {step === 1 && (
        <form onSubmit={handleRequestReset} className="space-y-4">
          <div className="space-y-1.5">
            <label className={FIELD_LABEL}>Email</label>
            <Input type="email" placeholder="your@email.com" className={FIELD_CLASS} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <AdminButton type="submit" disabled={requestResetMutation.isPending} className="h-11 w-full text-sm">
            {requestResetMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send verification code"}
          </AdminButton>

          <p className="pt-1 text-center text-sm text-adminreg-muted">
            <Link href="/" className="font-medium text-adminreg-olive hover:text-adminreg-olive-dark">Back to login</Link>
          </p>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="space-y-2">
            <p className="text-center text-sm text-adminreg-muted">Your code was sent to you via email</p>
            <div className="flex justify-center gap-2">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={inputRefs[index]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  aria-label={`Digit ${index + 1}`}
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  className="h-12 w-10 border border-adminreg-border bg-adminreg-bg text-center font-plexmono text-lg text-adminreg-text focus:outline-none focus:ring-1 focus:ring-adminreg-olive"
                />
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-adminreg-muted">
            We&apos;ve sent a 6-digit verification code to
            <br />
            <span className="font-semibold text-adminreg-text">{verifiedEmail || email}</span>
          </p>

          <AdminButton type="submit" disabled={verifyOtpMutation.isPending || otp.length !== 6} className="h-11 w-full text-sm">
            {verifyOtpMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify code"}
          </AdminButton>

          <div className="space-y-2 pt-1 text-center text-sm">
            <button type="button" onClick={() => setStep(1)} className="inline-flex w-full items-center justify-center gap-1 font-medium text-adminreg-olive hover:text-adminreg-olive-dark">
              <ArrowLeft className="h-3.5 w-3.5" />
              Change email
            </button>
            <button type="button" disabled={requestResetMutation.isPending} onClick={handleResendOtp} className="w-full font-medium text-adminreg-olive hover:text-adminreg-olive-dark disabled:opacity-60">
              Didn&apos;t receive the code? Send again
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-1.5">
            <label className={FIELD_LABEL}>New password</label>
            <Input type="password" placeholder="••••••••" className={FIELD_CLASS} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <label className={FIELD_LABEL}>Confirm password</label>
            <Input type="password" placeholder="••••••••" className={FIELD_CLASS} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>

          <AdminButton type="submit" disabled={resetPasswordMutation.isPending} className="h-11 w-full text-sm">
            {resetPasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset password"}
          </AdminButton>

          <div className="pt-1 text-center text-sm">
            <button type="button" onClick={() => setStep(2)} className="inline-flex items-center justify-center gap-1 font-medium text-adminreg-olive hover:text-adminreg-olive-dark">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to verification
            </button>
          </div>
        </form>
      )}

      {step === 4 && (
        <div className="space-y-5 text-center">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center bg-adminreg-olive-soft">
              <CheckCircle2 className="h-7 w-7 text-adminreg-olive-dark" />
            </div>
          </div>
          <p className="text-sm text-adminreg-muted">{STEP_COPY[4].subtitle}</p>
          <Link href="/">
            <AdminButton type="button" className="h-11 w-full text-sm">Back to login</AdminButton>
          </Link>
        </div>
      )}
    </div>
  )
}
