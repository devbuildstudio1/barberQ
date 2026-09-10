"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useAction } from "@/hooks/use-action";
import { sendPhoneOtp } from "@/lib/auth/actions";
import { phoneStartSchema, type PhoneStartInput } from "@/lib/validation/auth";

interface Props {
  mode: "login" | "register";
  next?: string;
}

export function PhoneLoginForm({ mode, next }: Props) {
  const router = useRouter();
  const form = useForm<PhoneStartInput>({
    resolver: zodResolver(phoneStartSchema),
    defaultValues: { phone: "", name: mode === "register" ? "" : undefined },
  });
  const { run, pending } = useAction<PhoneStartInput, { phone: string }>(sendPhoneOtp, {
    onSuccess: (data, input) => {
      const params = new URLSearchParams({ phone: data.phone });
      if (input.name) params.set("name", input.name);
      if (next) params.set("next", next);
      router.push(`/verify?${params.toString()}`);
    },
  });

  return (
    <form onSubmit={form.handleSubmit((values) => run(values, form.setError))} className="space-y-4" noValidate>
      {mode === "register" ? (
        <FormField label="Your name" htmlFor="name" error={form.formState.errors.name?.message} required>
          <Input id="name" autoComplete="name" placeholder="e.g. Rahul Sharma" leftIcon={<User />} invalid={!!form.formState.errors.name} {...form.register("name")} />
        </FormField>
      ) : null}
      <FormField label="Mobile number" htmlFor="phone" error={form.formState.errors.phone?.message} hint="We'll text you a 6-digit code." required>
        <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" leftIcon={<Phone />} invalid={!!form.formState.errors.phone} {...form.register("phone")} />
      </FormField>
      <Button type="submit" size="lg" fullWidth loading={pending}>
        {mode === "register" ? "Create account" : "Send code"}
      </Button>
    </form>
  );
}
