"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useAction } from "@/hooks/use-action";
import { signInWithPassword } from "@/lib/auth/actions";
import type { UserRole } from "@/lib/auth/session";
import { emailLoginSchema, type EmailLoginInput } from "@/lib/validation/auth";

interface Props {
  expectRole?: UserRole;
  next?: string;
  submitLabel?: string;
}

export function EmailLoginForm({ expectRole, next, submitLabel = "Sign in" }: Props) {
  const router = useRouter();
  const form = useForm<EmailLoginInput>({ resolver: zodResolver(emailLoginSchema), defaultValues: { email: "", password: "" } });
  const { run, pending } = useAction((input: EmailLoginInput) => signInWithPassword(input, expectRole), {
    onSuccess: ({ redirectTo }) => {
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : redirectTo);
      router.refresh();
    },
  });

  return (
    <form onSubmit={form.handleSubmit((values) => run(values, form.setError))} className="space-y-4" noValidate>
      <FormField label="Email" htmlFor="email" error={form.formState.errors.email?.message} required>
        <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" leftIcon={<Mail />} invalid={!!form.formState.errors.email} {...form.register("email")} />
      </FormField>
      <FormField label="Password" htmlFor="password" error={form.formState.errors.password?.message} required>
        <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" leftIcon={<Lock />} invalid={!!form.formState.errors.password} {...form.register("password")} />
      </FormField>
      <Button type="submit" size="lg" fullWidth loading={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
