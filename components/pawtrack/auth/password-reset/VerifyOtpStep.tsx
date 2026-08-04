import React, { useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface VerifyOtpStepProps {
  otpDigits: string[];
  handleOtpChange: (index: number, value: string) => void;
  handleKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  handlePaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  email: string;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onResend: () => void;
  isPending: boolean;
  isComplete: boolean;
  inputRefs: React.RefObject<HTMLInputElement>[];
}

export function VerifyOtpStep({
  otpDigits,
  handleOtpChange,
  handleKeyDown,
  handlePaste,
  email,
  onSubmit,
  onBack,
  onResend,
  isPending,
  isComplete,
  inputRefs
}: VerifyOtpStepProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <p className="text-center text-gray-600 dark:text-gray-400 mb-2">Your code was sent to you via email</p>
        <div className="flex justify-center gap-2">
          {otpDigits.map((digit, index) => (
            <Input
              key={index}
              ref={inputRefs[index]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              className="w-10 h-10 text-center text-lg font-medium border-gray-300 rounded"
              aria-label={`Digit ${index + 1}`}
              autoComplete={index === 0 ? "one-time-code" : "off"}
            />
          ))}
        </div>
      </div>

      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        <p>We've sent a 6-digit verification code to</p>
        <p className="font-medium mt-1">{email}</p>
      </div>

      <Button 
        type="submit" 
        className="w-full theme-button text-white" 
        disabled={isPending || !isComplete}
      >
        {isPending ? "Verifying..." : "Verify code"}
      </Button>

      <div className="text-center space-y-2">
        <button
          type="button"
          className="text-sm font-medium theme-text-accent hover:opacity-80 hover:underline w-full"
          onClick={onBack}
        >
          <div className="flex items-center justify-center gap-1">
            <ArrowLeft className="h-3 w-3" />
            Change email
          </div>
        </button>
        
        <button
          type="button"
          className="text-sm hover:opacity-80 hover:underline w-full theme-text-accent font-medium"
          onClick={onResend}
          disabled={isPending}
        >
          Didn't receive the code? Send again
        </button>
      </div>
    </form>
  );
} 