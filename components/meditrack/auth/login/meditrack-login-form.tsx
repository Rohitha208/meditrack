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
      const isSuperAdmin = data.user.roleName === "Super Admin"
      router.push(isSuperAdmin ? "/admin/companies" : "/admin/dashboard")
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
