"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/forms/image-upload";
import { useAction } from "@/hooks/use-action";
import { updateProfile } from "@/lib/auth/actions";
import { profileUpdateSchema, type ProfileUpdateInput } from "@/lib/validation/auth";

interface Props {
  profile: { name: string | null; email: string | null; phone: string | null; profile_image: string | null; role: string };
}

export function ProfileForm({ profile }: Props) {
  const router = useRouter();
  const form = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: { name: profile.name ?? "", email: profile.email ?? "", profile_image: profile.profile_image },
  });
  const { run, pending } = useAction(updateProfile, {
    successMessage: "Profile saved",
    onSuccess: () => router.refresh(),
  });
  const e = form.formState.errors;

  return (
    <form onSubmit={form.handleSubmit((v) => run(v, form.setError))} className="space-y-5" noValidate>
      <div className="flex items-center gap-5">
        <Controller
          control={form.control}
          name="profile_image"
          render={({ field }) => <ImageUpload bucket="avatars" shape="round" value={field.value} onChange={field.onChange} label="Photo" />}
        />
      </div>
      <FormField label="Name" htmlFor="name" error={e.name?.message} required>
        <Input id="name" autoComplete="name" invalid={!!e.name} {...form.register("name")} />
      </FormField>
      <FormField label="Mobile number" htmlFor="phone" hint="Your sign-in number can't be changed here.">
        <Input id="phone" value={profile.phone ?? "—"} disabled readOnly />
      </FormField>
      <FormField label="Email" htmlFor="email" error={e.email?.message} hint="Optional. Used for receipts and updates.">
        <Input id="email" type="email" autoComplete="email" invalid={!!e.email} {...form.register("email")} />
      </FormField>
      <div className="flex items-center justify-between gap-3 pt-2">
        <Badge variant="outline">Account type: {profile.role.replace("_", " ")}</Badge>
        <Button type="submit" loading={pending}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
