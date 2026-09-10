"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useAction } from "@/hooks/use-action";
import { sendPhoneOtp, verifyPhoneOtp } from "@/lib/auth/actions";
import { phoneVerifySchema, type PhoneVerifyInput } from "@/lib/validation/auth";

interface Props {
  phone: string;
  name?: string;
  next?: string;
}

export function OtpForm({ phone, name, next }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [cooldown, setCooldown] = React.useState(30);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const form = useForm<PhoneVerifyInput>({
    resolver: zodResolver(phoneVerifySchema),
    defaultValues: { phone, token: "", name },
  });

  const verify = useAction(verifyPhoneOtp, {
    onSuccess: ({ redirectTo }) => {
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : redirectTo);
      router.refresh();
    },
  });
  const resend = useAction(sendPhoneOtp, {
    onSuccess: () => {
      setCooldown(30);
      toast.success("Code sent again");
    },
  });

  return (
    <form onSubmit={form.handleSubmit((values) => verify.run(values, form.setError))} className="space-y-4" noValidate>
      <FormField label="6-digit code" htmlFor="token" error={form.formState.errors.token?.message} required>
        <Input
          id="token"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="••••••"
          className="text-center text-2xl tracking-[0.5em] font-semibold md:text-2xl"
          invalid={!!form.formState.errors.token}
          autoFocus
          {...form.register("token")}
        />
      </FormField>
      <Button type="submit" size="lg" fullWidth loading={verify.pending}>
        Verify & continue
      </Button>
      <p className="text-center text-sm text-ink-500">
        Didn&apos;t get it?{" "}
        <button
          type="button"
          disabled={cooldown > 0 || resend.pending}
          onClick={() => resend.run({ phone, name })}
          className="font-medium text-brand-700 disabled:text-ink-400"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </p>
    </form>
  );
}
