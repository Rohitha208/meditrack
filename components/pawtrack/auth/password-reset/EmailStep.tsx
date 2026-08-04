import React from "react";
import { Mail } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface EmailStepProps {
  email: string;
  setEmail: (email: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function EmailStep({ email, setEmail, onSubmit, isPending }: EmailStepProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 dark:text-gray-400" />
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            className="pl-10"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full theme-button text-white" 
        disabled={isPending}
      >
        {isPending ? "Sending..." : "Send verification code"}
      </Button>

      <div className="text-center">
        <Link href="/" className={cn("text-sm font-medium hover:underline hover:opacity-80", "theme-text-accent")}>
          Back to login
        </Link>
      </div>
    </form>
  );
} 