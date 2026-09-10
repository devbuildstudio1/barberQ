"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/input";
import { RatingInput } from "@/components/ui/rating";
import { useAction } from "@/hooks/use-action";
import { submitReviewAction } from "@/lib/queue/actions";
import { formatRelative } from "@/lib/utils";
import { reviewSchema, type ReviewInput } from "@/lib/validation/queue";
import type { ReviewableVisit } from "@/types/domain";

export function ReviewPrompt({ visit }: { visit: ReviewableVisit }) {
  const router = useRouter();
  const [expanded, setExpanded] = React.useState(false);
  const form = useForm<ReviewInput>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { queue_entry_id: visit.queue_entry_id, rating: 0, review: "" },
  });
  const { run, pending } = useAction(submitReviewAction, {
    successMessage: "Thanks for your review!",
    onSuccess: () => router.refresh(),
  });
  const rating = useWatch({ control: form.control, name: "rating" });

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-ink-500">
          {visit.service_name}
          {visit.barber_name ? ` with ${visit.barber_name}` : ""} · {formatRelative(visit.completed_at)}
        </p>
        <p className="font-semibold text-ink-950">{visit.shop_name}</p>
        <form onSubmit={form.handleSubmit((v) => run(v, form.setError))} className="mt-3 space-y-3" noValidate>
          <Controller
            control={form.control}
            name="rating"
            render={({ field }) => (
              <RatingInput
                value={Number(field.value) || 0}
                onChange={(v) => {
                  field.onChange(v);
                  setExpanded(true);
                }}
                name={`rating-${visit.queue_entry_id}`}
              />
            )}
          />
          {form.formState.errors.rating ? (
            <p role="alert" className="text-sm text-danger-600">
              {form.formState.errors.rating.message}
            </p>
          ) : null}
          {expanded || Number(rating) > 0 ? (
            <>
              <FormField label="Anything to add?" htmlFor={`review-${visit.queue_entry_id}`} error={form.formState.errors.review?.message}>
                <Textarea id={`review-${visit.queue_entry_id}`} rows={3} placeholder="What did you like? What could be better?" {...form.register("review")} />
              </FormField>
              <div className="flex justify-end">
                <Button type="submit" size="sm" loading={pending} disabled={!rating}>
                  Submit review
                </Button>
              </div>
            </>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
