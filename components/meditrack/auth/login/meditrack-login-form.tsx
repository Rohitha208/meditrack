"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { AdminButton } from "@/components/meditrack/admin/register"
import { useLoginMutation } from "@/queries/auth/login-user"
import { setJwtToken, setUserId, setClientId, setCompanyId } from "@/utils/clientCookie"
import { useToast } from "@/hooks/use-toast"
import { useRootContext } from "@/context/RootContext"
import { getCompanySubdomain } from "@/utils/subdomain"
import { useGetCompanyBySubdomain } from "@/queries/companies"
import { getBrandName, getSubdomainFromHost } from "@/utils/appMode"

const loginSchema = z.object({
  email: z.string().min(2, { message: "Username is required." }),
  password: z.string().min(4, { message: "Password must be at least 4 characters." }),
})

type LoginFormValues = z.infer<typeof loginSchema>

const FIELD_LABEL = "block font-plexmono text-[10px] uppercase tracking-[0.04em] text-adminreg-muted2"
const FIELD_CLASS = "h-11 rounded-none border-adminreg-border bg-adminreg-bg font-archivo text-sm text-adminreg-text placeholder:text-adminreg-muted focus-visible:ring-1 focus-visible:ring-adminreg-olive"

/**
 * MediTrack's own login form — same email/password submit + redirect flow as
 * PawTrack's shared LoginForm (queries/auth/login-user.ts has no concept of
 * "user type" or SSO), restyled to the Administration Register's palette
 * (square corners, Archivo + IBM Plex Mono, olive accent, no drop shadow).
 * Google/Biometric aren't wired to a real provider — clicking them is
 * honest about that via a toast rather than silently doing nothing.
 */
export function MediTrackLoginForm() {
  const { fetchUser, setProductType } = useRootContext()
  const { toast } = useToast()
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const subdomain = getCompanySubdomain()
  const { data: company } = useGetCompanyBySubdomain(subdomain)
  const productBrandName = getBrandName(typeof window !== "undefined" ? getSubdomainFromHost(window.location.host) : null)

  const loginMutation = useLoginMutation({
    onSuccess: (data: any) => {
      setJwtToken(data.token)
      setUserId(data.user.id)

      if (data.user.companyId) {
        setCompanyId(data.user.companyId)
      } else if (data.user.clinicCompanyId) {
        setCompanyId(data.user.clinicCompanyId)
      }

      if (data.user.roleName === "Client") {
        setClientId(data.user.id)
      }

      setProductType(data.user.productType || data.user.companyProductType || company?.productType)
      fetchUser(data, data.user.roleName)
      // MediTrack has no generic dashboard anymore — every hospital tenant
      // lands straight on the Admin Overview by default.
      router.push(data.redirectUrl ? data.redirectUrl : "/admin/dashboard")
      toast({ title: "Login Successful", description: `Welcome to ${productBrandName}`, variant: "success" })
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Invalid credentials. Please try again.",
        variant: "destructive",
      })
    },
  })

  function onSubmit(values: LoginFormValues) {
    loginMutation.mutate(values as any)
  }

  function handleComingSoon(provider: string) {
    toast({ title: "Coming soon", description: `Sign in with ${provider} isn't available yet.` })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 font-archivo">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <label className={FIELD_LABEL}>Username</label>
              <FormControl>
                <Input placeholder="Enter your username" className={FIELD_CLASS} data-testid="email-input" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <label className={FIELD_LABEL}>Password</label>
              <FormControl>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="Enter your password" className={`${FIELD_CLASS} pr-16`} data-testid="password-input" {...field} />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 font-plexmono text-[10px] font-semibold uppercase tracking-wide text-adminreg-olive hover:text-adminreg-olive-dark"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-adminreg-muted">
            <Checkbox
              checked={rememberMe}
              onCheckedChange={(v) => setRememberMe(!!v)}
              className="rounded-none border-adminreg-border data-[state=checked]:border-adminreg-olive data-[state=checked]:bg-adminreg-olive"
            />
            Remember Me
          </label>
          <Link href="/forgot-password" className="text-sm font-medium text-adminreg-olive hover:text-adminreg-olive-dark">
            Forgot Password?
          </Link>
        </div>

        <AdminButton type="submit" disabled={loginMutation.isPending} data-testid="login-submit" className="h-11 w-full text-sm">
          {loginMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
        </AdminButton>

        <div className="flex items-center gap-3 pt-1">
          <span className="h-px flex-1 bg-adminreg-border" />
          <span className="font-plexmono text-[10px] uppercase tracking-wide text-adminreg-muted">or continue with</span>
          <span className="h-px flex-1 bg-adminreg-border" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleComingSoon("Google")}
            className="flex h-11 items-center justify-center gap-2 rounded-none border border-adminreg-border bg-adminreg-card text-sm font-medium text-adminreg-muted transition-colors hover:bg-adminreg-header"
          >
            <GoogleIcon className="h-4 w-4" />
            Google
          </button>
          <button
            type="button"
            onClick={() => handleComingSoon("biometrics")}
            className="flex h-11 items-center justify-center gap-2 rounded-none border border-adminreg-border bg-adminreg-card text-sm font-medium text-adminreg-muted transition-colors hover:bg-adminreg-header"
          >
            Biometric
          </button>
        </div>

        <p className="pt-1 text-center text-sm text-adminreg-muted">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-adminreg-olive hover:text-adminreg-olive-dark">
            Contact Administrator
          </Link>
        </p>
      </form>
    </Form>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.42 3.58v3h3.91c2.29-2.11 3.53-5.22 3.53-8.82Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.91-3c-1.08.72-2.47 1.16-4.02 1.16-3.09 0-5.71-2.09-6.65-4.9H1.32v3.09C3.29 21.3 7.31 24 12 24Z" />
      <path fill="#FBBC05" d="M5.35 14.35c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.7H1.32C.48 8.36 0 10.13 0 12s.48 3.64 1.32 5.3l4.03-3.15Z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.29 2.7 1.32 6.7l4.03 3.09c.94-2.81 3.56-4.9 6.65-4.9Z" />
    </svg>
  )
}
