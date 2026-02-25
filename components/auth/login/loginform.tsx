"use client";
import React from 'react';
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useLoginMutation } from "@/queries/auth/login-user";
import { useRouter } from "next/navigation";
import { setJwtToken, setUserId, setClientId, setCompanyId } from '@/utils/clientCookie';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRootContext } from '@/context/RootContext';
import { getCompanySubdomain } from "@/utils/subdomain"
import { useGetCompanyBySubdomain } from "@/queries/companies"

const loginSchema = z.object({
  email: z.string().min(2, {
    message: "Email is required.",
  }),
  password: z.string().min(4, {
    message: "Password must be at least 8 characters.",
  }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  hideRegisterLink?: boolean;
}

export function LoginForm({ hideRegisterLink }: LoginFormProps) {
  const { setUser, fetchUser } = useRootContext();
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })
  const subdomain = getCompanySubdomain()
  const { data: company, isLoading: companyLoading, error: companyError } = useGetCompanyBySubdomain(subdomain)

  const loginMutation = useLoginMutation({
    onSuccess: (data: any) => {
      setJwtToken(data.token);
      setUserId(data.user.id);

      // Set company ID if it exists in the response
      if (data.user.companyId) {
        setCompanyId(data.user.companyId);
      } else if (data.user.clinicCompanyId) {
        // Try alternate property name if companyId is not present
        setCompanyId(data.user.clinicCompanyId);
      }

      if(data.user.roleName === "Client"){
        setClientId(data.user.id);
      }
      fetchUser(data, data.user.roleName);
      router.push(data.redirectUrl ? data.redirectUrl : "/dashboard");
      toast({
        title: "Login Successful",
        description: "Welcome to the PawTrack",
        variant: "success",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Invalid credentials. Please try again.",
        variant: "destructive",
      })
    }
  });

  function onSubmit(values: LoginFormValues) {
    loginMutation.mutate(values as any);
  }

  return (
    <Card className="mx-auto max-w-sm max-h-full md:max-h-[calc(100vh-15rem)] overflow-y-auto">
      <CardHeader>
        {/* <CardTitle className="text-2xl mx-auto">Pet Health Portal</CardTitle>
        <CardDescription className="mx-auto text-center">
          Enter your credentials to access your pet's health information
        </CardDescription> */}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="your.email@example.com" {...field} data-testid="email-input" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center">
                    <FormLabel>Password</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="ml-auto inline-block text-sm underline theme-text-accent hover:opacity-80 font-medium"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <Input type="password" placeholder="Enter your password" {...field} data-testid="password-input" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={loginMutation.isPending} data-testid="login-submit">
              {loginMutation.isPending ? <Loader2 className="animate-spin" /> : "Access"} {company?.name || "Portal"}
            </Button>
          </form>
        </Form>
        {!hideRegisterLink && (
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/register"  className="ml-auto inline-block text-sm underline theme-text-accent hover:opacity-80 font-medium" data-testid="register-link">

              Register here
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
