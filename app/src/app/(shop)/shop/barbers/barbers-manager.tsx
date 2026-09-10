"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ImageUpload } from "@/components/forms/image-upload";
import { useAction } from "@/hooks/use-action";
import { createBarberAction, deleteBarberAction, updateBarberAction } from "@/lib/shops/actions";
import { barberSchema, type BarberInput } from "@/lib/validation/shop";
import { useToast } from "@/components/ui/toast";
import type { Barber, BarberAvailability } from "@/types/domain";

const AVAILABILITY: { value: BarberAvailability; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "on_break", label: "On break" },
  { value: "off_duty", label: "Off duty" },
];

const availabilityBadge: Record<BarberAvailability, "success" | "warning" | "neutral"> = {
  available: "success",
  on_break: "warning",
  off_duty: "neutral",
};

export function BarbersManager({ shopId, initialBarbers }: { shopId: string; initialBarbers: Barber[] }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = React.useState<Barber | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleting, setDeleting] = React.useState<Barber | null>(null);

  const del = useAction(deleteBarberAction, {
    onSuccess: ({ deleted }) => {
      toast.success(deleted ? "Barber removed" : "Barber deactivated", deleted ? undefined : "They have queue history, so their record is kept.");
      setDeleting(null);
      router.refresh();
    },
  });
  const quickUpdate = useAction(updateBarberAction, { onSuccess: () => router.refresh() });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus /> Add barber
        </Button>
      </div>

      {initialBarbers.length === 0 ? (
        <EmptyState
          icon={<UserPlus />}
          title="No barbers yet"
          description="Add the people who work the chairs. Customers can pick a specific barber when joining the queue."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus /> Add your first barber
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {initialBarbers.map((b) => (
            <li key={b.id}>
              <Card className={b.status === "inactive" ? "opacity-70" : undefined}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar src={b.image} name={b.name} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink-950">{b.name}</p>
                      <p className="truncate text-xs text-ink-500">
                        {b.experience_years > 0 ? `${b.experience_years} yrs exp` : "New"}
                        {b.specialization ? ` · ${b.specialization}` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge variant={b.status === "active" ? "brand" : "neutral"} size="sm">
                          {b.status === "active" ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant={availabilityBadge[b.availability]} size="sm" dot>
                          {AVAILABILITY.find((a) => a.value === b.availability)?.label}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <label className="sr-only" htmlFor={`avail-${b.id}`}>
                      Availability for {b.name}
                    </label>
                    <Select
                      id={`avail-${b.id}`}
                      value={b.availability}
                      disabled={b.status !== "active" || quickUpdate.pending}
                      onChange={(e) => quickUpdate.run({ barber_id: b.id, availability: e.target.value })}
                      className="h-9 md:h-9"
                    >
                      {AVAILABILITY.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </Select>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" fullWidth onClick={() => setEditing(b)}>
                        <Pencil /> Edit
                      </Button>
                      {b.status === "active" ? (
                        <Button variant="ghost" size="sm" onClick={() => quickUpdate.run({ barber_id: b.id, status: "inactive", availability: "off_duty" })} loading={quickUpdate.pending}>
                          Deactivate
                        </Button>
                      ) : (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => quickUpdate.run({ barber_id: b.id, status: "active", availability: "available" })} loading={quickUpdate.pending}>
                            Reactivate
                          </Button>
                          <Button variant="ghost" size="icon-sm" aria-label={`Delete ${b.name}`} onClick={() => setDeleting(b)}>
                            <Trash2 className="text-danger-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <BarberDialog key={editing?.id ?? (creating ? "new" : "closed")} shopId={shopId} barber={editing} open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await del.run({ barber_id: deleting.id });
        }}
        loading={del.pending}
        destructive
        title={`Delete ${deleting?.name ?? "barber"}?`}
        description="If this barber has served customers, the record is deactivated instead so history stays intact."
        confirmLabel="Delete barber"
      />
    </div>
  );
}

function BarberDialog({ shopId, barber, open, onClose }: { shopId: string; barber: Barber | null; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const form = useForm<BarberInput>({
    resolver: zodResolver(barberSchema),
    defaultValues: {
      name: barber?.name ?? "",
      image: barber?.image ?? null,
      experience_years: barber?.experience_years ?? 0,
      specialization: barber?.specialization ?? "",
      status: barber?.status ?? "active",
      availability: barber?.availability ?? "available",
    },
  });
  const onDone = () => {
    onClose();
    router.refresh();
  };
  const create = useAction(createBarberAction, { successMessage: "Barber added", onSuccess: onDone });
  const update = useAction(updateBarberAction, { successMessage: "Barber updated", onSuccess: onDone });
  const pending = create.pending || update.pending;
  const e = form.formState.errors;

  const submit = form.handleSubmit((values) => {
    if (barber) update.run({ ...values, barber_id: barber.id }, form.setError);
    else create.run({ ...values, shop_id: shopId }, form.setError);
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      locked={pending}
      title={barber ? `Edit ${barber.name}` : "Add barber"}
      description="Customers see this on your shop page and when joining the queue."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={pending}>
            {barber ? "Save changes" : "Add barber"}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Controller control={form.control} name="image" render={({ field }) => <ImageUpload bucket="barber-photos" shape="round" value={field.value} onChange={field.onChange} label="Photo" />} />
        <FormField label="Name" htmlFor="barber-name" error={e.name?.message} required>
          <Input id="barber-name" invalid={!!e.name} {...form.register("name")} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Experience (years)" htmlFor="barber-exp" error={e.experience_years?.message}>
            <Input id="barber-exp" type="number" min={0} max={60} invalid={!!e.experience_years} {...form.register("experience_years")} />
          </FormField>
          <FormField label="Availability" htmlFor="barber-avail" error={e.availability?.message}>
            <Select id="barber-avail" {...form.register("availability")}>
              {AVAILABILITY.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <FormField label="Specialization" htmlFor="barber-spec" error={e.specialization?.message} hint="e.g. Skin fades, beard sculpting">
          <Input id="barber-spec" invalid={!!e.specialization} {...form.register("specialization")} />
        </FormField>
        <FormField label="Status" htmlFor="barber-status" error={e.status?.message}>
          <Select id="barber-status" {...form.register("status")}>
            <option value="active">Active — bookable</option>
            <option value="inactive">Inactive — hidden from customers</option>
          </Select>
        </FormField>
      </form>
    </Dialog>
  );
}
