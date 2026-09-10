"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { ImageUpload } from "@/components/forms/image-upload";
import { LocationPicker } from "@/components/shop/location-picker";
import { useAction } from "@/hooks/use-action";
import { updateShopAction } from "@/lib/shops/actions";
import { shopUpdateSchema, type ShopUpdateInput } from "@/lib/validation/shop";
import type { Shop } from "@/types/domain";

export function ShopSettingsForm({ shop }: { shop: Shop }) {
  const router = useRouter();
  const [gallery, setGallery] = React.useState<string[]>(shop.images ?? []);

  const form = useForm<ShopUpdateInput>({
    resolver: zodResolver(shopUpdateSchema),
    defaultValues: {
      name: shop.name,
      description: shop.description ?? "",
      address: shop.address,
      city: shop.city ?? "",
      latitude: shop.latitude,
      longitude: shop.longitude,
      phone: shop.phone ?? "",
      email: shop.email ?? "",
      image: shop.image,
      opening_time: shop.opening_time.slice(0, 5),
      closing_time: shop.closing_time.slice(0, 5),
    },
  });
  const { run, pending } = useAction(updateShopAction, {
    successMessage: "Shop updated",
    onSuccess: () => router.refresh(),
  });
  const e = form.formState.errors;

  return (
    <form onSubmit={form.handleSubmit((v) => run({ ...v, images: gallery, shop_id: shop.id }, form.setError))} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Public profile</CardTitle>
          <CardDescription>What customers see on your shop page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Controller control={form.control} name="image" render={({ field }) => <ImageUpload bucket="shop-images" value={field.value} onChange={field.onChange} label="Cover photo" />} />

          <div>
            <p className="mb-2 text-sm font-medium text-ink-800">Gallery ({gallery.length}/10)</p>
            <div className="flex flex-wrap gap-3">
              {gallery.map((src) => (
                <div key={src} className="relative size-24 overflow-hidden rounded-md border border-border">
                  <Image src={src} alt="" fill sizes="96px" className="object-cover" />
                  <button
                    type="button"
                    onClick={() => setGallery((g) => g.filter((i) => i !== src))}
                    className="absolute top-1 right-1 rounded bg-ink-950/70 p-1 text-white hover:bg-danger-600"
                    aria-label="Remove photo"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
              {gallery.length < 10 ? (
                <div className="w-40">
                  <ImageUpload
                    bucket="shop-images"
                    shape="square"
                    value={null}
                    label="Add photo"
                    onChange={(url) => {
                      if (url) setGallery((g) => (g.includes(url) ? g : [...g, url]));
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Shop name" htmlFor="s-name" error={e.name?.message} required>
              <Input id="s-name" invalid={!!e.name} {...form.register("name")} />
            </FormField>
            <FormField label="City" htmlFor="s-city" error={e.city?.message}>
              <Input id="s-city" invalid={!!e.city} {...form.register("city")} />
            </FormField>
          </div>

          <FormField label="Description" htmlFor="s-desc" error={e.description?.message}>
            <Textarea id="s-desc" rows={3} {...form.register("description")} />
          </FormField>

          <FormField label="Address" htmlFor="s-address" error={e.address?.message} required>
            <Input id="s-address" invalid={!!e.address} {...form.register("address")} />
          </FormField>

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
            <FormField label="Phone" htmlFor="s-phone" error={e.phone?.message}>
              <Input id="s-phone" type="tel" invalid={!!e.phone} {...form.register("phone")} />
            </FormField>
            <FormField label="Email" htmlFor="s-email" error={e.email?.message}>
              <Input id="s-email" type="email" invalid={!!e.email} {...form.register("email")} />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Opening hours</CardTitle>
          <CardDescription>Outside these hours your shop shows as closed and can&apos;t take new customers.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Opening time" htmlFor="s-open" error={e.opening_time?.message} required>
            <Input id="s-open" type="time" invalid={!!e.opening_time} {...form.register("opening_time")} />
          </FormField>
          <FormField label="Closing time" htmlFor="s-close" error={e.closing_time?.message} required>
            <Input id="s-close" type="time" invalid={!!e.closing_time} {...form.register("closing_time")} />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={pending}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
