import React from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SuccessStep() {
  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
          <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
        </div>
      </div>
      
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Password reset successful!
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Your password has been changed successfully. You can now log in with your new password.
        </p>
      </div>

      <div className="text-center">
        <Link href="/">
          <Button className="mt-4 theme-button text-white">
            Back to login
          </Button>
        </Link>
      </div>
    </div>
  );
} 