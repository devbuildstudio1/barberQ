"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Clock, Pencil, Plus, Scissors, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useAction } from "@/hooks/use-action";
import { createServiceAction, deleteServiceAction, updateServiceAction } from "@/lib/shops/actions";
import { formatINR, formatMinutes } from "@/lib/utils";
import { serviceSchema, type ServiceInput } from "@/lib/validation/shop";
import type { Service } from "@/types/domain";

export function ServicesManager({ shopId, initialServices }: { shopId: string; initialServices: Service[] }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = React.useState<Service | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleting, setDeleting] = React.useState<Service | null>(null);

  const del = useAction(deleteServiceAction, {
    onSuccess: ({ deleted }) => {
      toast.success(deleted ? "Service deleted" : "Service disabled", deleted ? undefined : "It has queue history, so the record is kept.");
      setDeleting(null);
      router.refresh();
    },
  });
  const toggle = useAction(updateServiceAction, { onSuccess: () => router.refresh() });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus /> Add service
        </Button>
      </div>

      {initialServices.length === 0 ? (
        <EmptyState
          icon={<Scissors />}
          title="No services yet"
          description="Customers pick a service when joining the queue. Add at least one to go live."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus /> Add your first service
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <caption className="sr-only">Services offered by this shop</caption>
            <thead className="bg-surface-muted text-left text-xs font-semibold tracking-wide text-ink-500 uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Service
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Price
                </th>
                <th scope="col" className="hidden px-4 py-3 text-right sm:table-cell">
                  Duration
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initialServices.map((s) => (
                <tr key={s.id} className={s.status === "inactive" ? "opacity-60" : undefined}>
                  <td className="px-4 py-3 font-semibold text-ink-950">
                    {s.name}
                    <span className="block text-xs font-normal text-ink-500 sm:hidden">
                      <Clock className="mr-1 inline size-3" aria-hidden />
                      {formatMinutes(s.duration_minutes)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular">{formatINR(Number(s.price))}</td>
                  <td className="hidden px-4 py-3 text-right text-ink-600 tabular sm:table-cell">{formatMinutes(s.duration_minutes)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={s.status === "active" ? "success" : "neutral"} size="sm" dot>
                      {s.status === "active" ? "Active" : "Disabled"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={toggle.pending}
                        onClick={() => toggle.run({ service_id: s.id, status: s.status === "active" ? "inactive" : "active" })}
                      >
                        {s.status === "active" ? "Disable" : "Enable"}
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${s.name}`} onClick={() => setEditing(s)}>
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Delete ${s.name}`} onClick={() => setDeleting(s)}>
                        <Trash2 className="text-danger-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <ServiceDialog
        key={editing?.id ?? (creating ? "new" : "closed")}
        shopId={shopId}
        service={editing}
        open={creating || !!editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await del.run({ service_id: deleting.id });
        }}
        loading={del.pending}
        destructive
        title={`Delete ${deleting?.name ?? "service"}?`}
        description="If customers have booked this service, it's disabled instead so history and receipts stay intact."
        confirmLabel="Delete service"
      />
    </div>
  );
}

function ServiceDialog({ shopId, service, open, onClose }: { shopId: string; service: Service | null; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const form = useForm<ServiceInput>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: service?.name ?? "",
      price: service ? Number(service.price) : 150,
      duration_minutes: service?.duration_minutes ?? 30,
      status: service?.status ?? "active",
    },
  });
  const onDone = () => {
    onClose();
    router.refresh();
  };
  const create = useAction(createServiceAction, { successMessage: "Service added", onSuccess: onDone });
  const update = useAction(updateServiceAction, { successMessage: "Service updated", onSuccess: onDone });
  const pending = create.pending || update.pending;
  const e = form.formState.errors;

  const submit = form.handleSubmit((values) => {
    if (service) update.run({ ...values, service_id: service.id }, form.setError);
    else create.run({ ...values, shop_id: shopId }, form.setError);
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      locked={pending}
      title={service ? `Edit ${service.name}` : "Add service"}
      description="Duration feeds the wait-time estimate customers see."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={pending}>
            {service ? "Save changes" : "Add service"}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField label="Service name" htmlFor="svc-name" error={e.name?.message} required>
          <Input id="svc-name" placeholder="e.g. Haircut + Beard" invalid={!!e.name} {...form.register("name")} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Price (₹)" htmlFor="svc-price" error={e.price?.message} required>
            <Input id="svc-price" type="number" min={0} step={10} inputMode="numeric" invalid={!!e.price} {...form.register("price")} />
          </FormField>
          <FormField label="Duration (minutes)" htmlFor="svc-duration" error={e.duration_minutes?.message} required>
            <Input id="svc-duration" type="number" min={5} max={480} step={5} inputMode="numeric" invalid={!!e.duration_minutes} {...form.register("duration_minutes")} />
          </FormField>
        </div>
        <FormField label="Status" htmlFor="svc-status" error={e.status?.message}>
          <Select id="svc-status" {...form.register("status")}>
            <option value="active">Active — customers can select it</option>
            <option value="inactive">Disabled — hidden from customers</option>
          </Select>
        </FormField>
      </form>
    </Dialog>
  );
}
