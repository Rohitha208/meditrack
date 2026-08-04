import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useRequestResetPasswordMutation } from "@/queries/auth/request-reset-password";
import { useVerifyResetOtpMutation } from "@/queries/auth/verify-reset-otp";
import { useResetPasswordMutation } from "@/queries/auth/reset-password";
import { EmailStep } from "@/components/pawtrack/auth/password-reset/EmailStep";
import { VerifyOtpStep } from "@/components/pawtrack/auth/password-reset/VerifyOtpStep";
import { NewPasswordStep } from "@/components/pawtrack/auth/password-reset/NewPasswordStep";
import { SuccessStep } from "@/components/pawtrack/auth/password-reset/SuccessStep";

interface PasswordResetFlowProps {
  initialEmail?: string;
}

export function PasswordResetFlow({ initialEmail = "" }: PasswordResetFlowProps) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const { toast } = useToast();

  // Create refs for OTP input fields
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Update combined OTP whenever individual digits change
  useEffect(() => {
    setOtp(otpDigits.join(""));
  }, [otpDigits]);

  // Form validations
  const validateEmail = () => {
    if (!email) return "Email is required";
    if (!/^\S+@\S+\.\S+$/.test(email)) return "Invalid email format";
    return "";
  };

  const validateOtp = () => {
    if (!otp) return "OTP code is required";
    if (!/^\d{6}$/.test(otp)) return "OTP must be 6 digits";
    return "";
  };

  const validatePassword = () => {
    if (!newPassword) return "New password is required";
    if (newPassword.length < 8) return "Password must be at least 8 characters";
    if (newPassword !== confirmPassword) return "Passwords do not match";
    return "";
  };

  // Handle OTP input changes
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) {
      return;
    }
    
    const newOtpDigits = [...otpDigits];
    newOtpDigits[index] = value.slice(-1); // Only take the last character if more than one is entered
    setOtpDigits(newOtpDigits);
    
    // Move focus to next input if this one is filled
    if (value && index < 5) {
      inputRefs[index + 1]?.current?.focus();
    }
  };

  // Handle backspace key press
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // If pressing backspace with an empty field, focus previous input
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs[index - 1]?.current?.focus();
    }
  };

  // Handle pasting OTP
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/[^\d]/g, "").slice(0, 6);
    
    const newOtpDigits = [...otpDigits];
    for (let i = 0; i < pastedData.length; i++) {
      if (i < 6) {
        newOtpDigits[i] = pastedData[i];
      }
    }
    
    setOtpDigits(newOtpDigits);
    
    // Focus the next empty input or the last one
    const nextEmptyIndex = newOtpDigits.findIndex(digit => !digit);
    if (nextEmptyIndex !== -1 && nextEmptyIndex < 6) {
      inputRefs[nextEmptyIndex].current?.focus();
    } else {
      inputRefs[5].current?.focus();
    }
  };

  // Mutations setup
  const requestResetMutation = useRequestResetPasswordMutation({
    onSuccess: (data) => {
      toast({
        title: "OTP sent!",
        description: "A verification code has been sent to your email",
        duration: 3000,
      });
      setVerifiedEmail(email);
      setStep(2);
      
      // Focus the first OTP input when moving to step 2
      setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 100);
    },
    onError: (error: any) => {
      setError(error.message || "Failed to send reset code");
    },
  });

  const verifyOtpMutation = useVerifyResetOtpMutation({
    onSuccess: (data) => {
      toast({
        title: "OTP verified!",
        description: "Please set your new password",
        duration: 3000,
      });
      setStep(3);
    },
    onError: (error: any) => {
      setError(error.message || "Invalid verification code");
    },
  });

  const resetPasswordMutation = useResetPasswordMutation({
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: "Your password has been reset successfully",
        duration: 3000,
      });
      setStep(4);
    },
    onError: (error: any) => {
      setError(error.message || "Failed to reset password");
    },
  });

  // Handle form submissions
  const handleRequestReset = (e: React.FormEvent) => {
    e.preventDefault();
    const emailError = validateEmail();
    if (emailError) {
      setError(emailError);
      return;
    }

    setError("");
    requestResetMutation.mutate({ email });
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const otpError = validateOtp();
    if (otpError) {
      setError(otpError);
      return;
    }

    setError("");
    verifyOtpMutation.mutate({ email: verifiedEmail || email, otp });
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const passwordError = validatePassword();
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setError("");
    resetPasswordMutation.mutate({
      email: verifiedEmail || email,
      otp,
      newPassword,
    });
  };

  const handleResendOtp = () => {
    if (!requestResetMutation.isPending) {
      // Clear OTP fields
      setOtpDigits(["", "", "", "", "", ""]);
      requestResetMutation.mutate({ email: verifiedEmail || email });
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {step < 4 && (
        <>
          <div className="flex justify-center mb-6">
            <div className="relative w-28 h-28">
              <Image src="/images/logo.png" alt="PawTrack Logo" fill className="object-contain" priority />
            </div>
          </div>
          
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {step === 1 && "Reset your password"}
              {step === 2 && "Verify your identity"}
              {step === 3 && "Set new password"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {step === 1 && "Enter your email to receive a verification code"}
              {step === 2 && "Enter the 6-digit code sent to your email"}
              {step === 3 && "Create a secure new password for your account"}
            </p>
          </div>
        </>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === 1 && (
        <EmailStep
          email={email}
          setEmail={setEmail}
          onSubmit={handleRequestReset}
          isPending={requestResetMutation.isPending}
        />
      )}

      {step === 2 && (
        <VerifyOtpStep
          otpDigits={otpDigits}
          handleOtpChange={handleOtpChange}
          handleKeyDown={handleKeyDown}
          handlePaste={handlePaste}
          email={verifiedEmail || email}
          onSubmit={handleVerifyOtp}
          onBack={() => setStep(1)}
          onResend={handleResendOtp}
          isPending={verifyOtpMutation.isPending}
          isComplete={otp.length === 6}
          inputRefs={inputRefs as React.RefObject<HTMLInputElement>[]}
        />
      )}

      {step === 3 && (
        <NewPasswordStep
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          onSubmit={handleResetPassword}
          onBack={() => setStep(2)}
          isPending={resetPasswordMutation.isPending}
        />
      )}

      {step === 4 && <SuccessStep />}
    </div>
  );
}
