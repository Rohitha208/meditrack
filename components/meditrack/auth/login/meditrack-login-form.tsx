"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowRight, Building2, Eye, EyeOff, Fingerprint, Loader2, Lock, User } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { MtButton } from "@/components/meditrack/shared"
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

// const USER_TYPES = ["Doctor", "Nurse", "Reception", "Hospital Admin", "Super Admin"]

/**
 * MediTrack's own login form — same email/password submit + redirect flow as
 * PawTrack's shared LoginForm (queries/auth/login-user.ts has no concept of
 * "user type" or SSO), restyled to match the approved MediTrack mockup.
 * "User Type" is a display-only selector and Google/Fingerprint are not
 * wired to a real provider — clicking them is honest about that via a toast
 * rather than silently doing nothing.
 */
export function MediTrackLoginForm() {
  const { fetchUser, setProductType } = useRootContext()
  const { toast } = useToast()
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [userType, setUserType] = useState("")
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Username</label>
              <FormControl>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Enter your username"
                    className="h-11 rounded-xl border-slate-200 pl-10 dark:border-slate-700"
                    data-testid="email-input"
                    {...field}
                  />
                </div>
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
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Password</label>
              <FormControl>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="h-11 rounded-xl border-slate-200 pl-10 pr-10 dark:border-slate-700"
                    data-testid="password-input"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Checkbox
              checked={rememberMe}
              onCheckedChange={(v) => setRememberMe(!!v)}
              className="data-[state=checked]:border-brand-600 data-[state=checked]:bg-brand-600"
            />
            Remember Me
          </label>
          <Link href="/forgot-password" className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
            Forgot Password?
          </Link>
        </div>

        <MtButton
          type="submit"
          disabled={loginMutation.isPending}
          data-testid="login-submit"
          className="h-12 w-full gap-2 rounded-xl text-base font-semibold"
        >
          {loginMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Sign In
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </MtButton>

        <div className="flex items-center gap-3 pt-1">
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          <span className="text-xs text-slate-400">or continue with</span>
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleComingSoon("Google")}
            aria-label="Sign in with Google"
            className="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <GoogleIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => handleComingSoon("biometrics")}
            aria-label="Sign in with biometrics"
            className="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <Fingerprint className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </button>
        </div>

        <p className="pt-1 text-center text-sm text-slate-500 dark:text-slate-400">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
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
