"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { ImageUpload } from "@/components/forms/image-upload";
import { LocationPicker } from "@/components/shop/location-picker";
import { useAction } from "@/hooks/use-action";
import { createShopAction } from "@/lib/shops/actions";
import { shopRegisterSchema, type ShopRegisterInput } from "@/lib/validation/shop";

interface Props {
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
}

export function ShopRegisterForm({ ownerName, ownerPhone, ownerEmail }: Props) {
  const router = useRouter();
  const form = useForm<ShopRegisterInput>({
    resolver: zodResolver(shopRegisterSchema),
    defaultValues: {
      owner_name: ownerName,
      name: "",
      description: "",
      address: "",
      city: "Chennai",
      latitude: null,
      longitude: null,
      phone: ownerPhone,
      email: ownerEmail,
      image: null,
      images: [],
      opening_time: "09:00",
      closing_time: "21:00",
    },
  });
  const { run, pending } = useAction(createShopAction, {
    successMessage: "Shop submitted for review",
    onSuccess: () => {
      router.replace("/shop/dashboard");
      router.refresh();
    },
  });
  const e = form.formState.errors;

  return (
    <form onSubmit={form.handleSubmit((v) => run(v, form.setError))} className="space-y-5" noValidate>
      <Alert tone="info" title="Review takes up to 24 hours">
        Your shop stays hidden from customers until our team approves it. You can set up barbers and services in the meantime.
      </Alert>

      <Controller
        control={form.control}
        name="image"
        render={({ field }) => <ImageUpload bucket="shop-images" value={field.value} onChange={field.onChange} label="Add shop photo" />}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Shop name" htmlFor="name" error={e.name?.message} required>
          <Input id="name" placeholder="e.g. Classic Cuts" invalid={!!e.name} {...form.register("name")} />
        </FormField>
        <FormField label="Owner name" htmlFor="owner_name" error={e.owner_name?.message} required>
          <Input id="owner_name" autoComplete="name" invalid={!!e.owner_name} {...form.register("owner_name")} />
        </FormField>
      </div>

      <FormField label="About your shop" htmlFor="description" error={e.description?.message} hint="Optional. What makes your shop worth the trip?">
        <Textarea id="description" rows={3} placeholder="Classic cuts, hot-towel shaves and a chai while you wait." {...form.register("description")} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <FormField label="Address" htmlFor="address" error={e.address?.message} required>
          <Input id="address" autoComplete="street-address" placeholder="12, Anna Salai, Thousand Lights" invalid={!!e.address} {...form.register("address")} />
        </FormField>
        <FormField label="City" htmlFor="city" error={e.city?.message}>
          <Input id="city" autoComplete="address-level2" invalid={!!e.city} {...form.register("city")} />
        </FormField>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink-800">Map location</legend>
        <Controller
          control={form.control}
          name="latitude"
          render={({ field: latField }) => (
            <Controller
              control={form.control}
              name="longitude"
              render={({ field: lngField }) => (
                <LocationPicker
                  latitude={latField.value as number | null}
                  longitude={lngField.value as number | null}
                  onChange={({ latitude, longitude }) => {
                    latField.onChange(latitude);
                    lngField.onChange(longitude);
                  }}
                />
              )}
            />
          )}
        />
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Shop phone" htmlFor="phone" error={e.phone?.message}>
          <Input id="phone" type="tel" placeholder="98765 43210" invalid={!!e.phone} {...form.register("phone")} />
        </FormField>
        <FormField label="Shop email" htmlFor="email" error={e.email?.message}>
          <Input id="email" type="email" invalid={!!e.email} {...form.register("email")} />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Opening time" htmlFor="opening_time" error={e.opening_time?.message} required>
          <Input id="opening_time" type="time" invalid={!!e.opening_time} {...form.register("opening_time")} />
        </FormField>
        <FormField label="Closing time" htmlFor="closing_time" error={e.closing_time?.message} required>
          <Input id="closing_time" type="time" invalid={!!e.closing_time} {...form.register("closing_time")} />
        </FormField>
      </div>

      <Button type="submit" size="lg" fullWidth loading={pending}>
        Submit for review
      </Button>
    </form>
  );
}
