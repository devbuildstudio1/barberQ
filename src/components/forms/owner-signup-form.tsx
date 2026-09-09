"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useAction } from "@/hooks/use-action";
import { signUpOwner } from "@/lib/auth/actions";
import { ownerSignupSchema, type OwnerSignupInput } from "@/lib/validation/auth";

export function OwnerSignupForm() {
  const router = useRouter();
  const form = useForm<OwnerSignupInput>({
    resolver: zodResolver(ownerSignupSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", confirmPassword: "" },
  });
  const { run, pending } = useAction(signUpOwner, {
    onSuccess: ({ redirectTo }) => {
      router.replace(redirectTo);
      router.refresh();
    },
  });
  const e = form.formState.errors;

  return (
    <form onSubmit={form.handleSubmit((v) => run(v, form.setError))} className="space-y-4" noValidate>
      <FormField label="Owner name" htmlFor="name" error={e.name?.message} required>
        <Input id="name" autoComplete="name" invalid={!!e.name} {...form.register("name")} />
      </FormField>
      <FormField label="Email" htmlFor="email" error={e.email?.message} required>
        <Input id="email" type="email" autoComplete="email" invalid={!!e.email} {...form.register("email")} />
      </FormField>
      <FormField label="Mobile number" htmlFor="phone" error={e.phone?.message} required>
        <Input id="phone" type="tel" autoComplete="tel" placeholder="98765 43210" invalid={!!e.phone} {...form.register("phone")} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Password" htmlFor="password" error={e.password?.message} hint="At least 8 characters" required>
          <Input id="password" type="password" autoComplete="new-password" invalid={!!e.password} {...form.register("password")} />
        </FormField>
        <FormField label="Confirm password" htmlFor="confirmPassword" error={e.confirmPassword?.message} required>
          <Input id="confirmPassword" type="password" autoComplete="new-password" invalid={!!e.confirmPassword} {...form.register("confirmPassword")} />
        </FormField>
      </div>
      <Button type="submit" size="lg" fullWidth loading={pending}>
        Create owner account
      </Button>
    </form>
  );
}
