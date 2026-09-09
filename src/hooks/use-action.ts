"use client";

import * as React from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { ActionResult } from "@/lib/errors";
import { useToast } from "@/components/ui/toast";

interface UseActionOptions<TInput, TOutput> {
  onSuccess?: (data: TOutput, input: TInput) => void | Promise<void>;
  onError?: (error: Extract<ActionResult<TOutput>, { ok: false }>["error"]) => void;
  /** Show a toast on failure (default true). */
  toastError?: boolean;
  successMessage?: string;
}

/**
 * Wraps a server action returning ActionResult: tracks pending state, surfaces
 * errors via toast and maps field errors back onto a react-hook-form instance.
 */
export function useAction<TInput, TOutput>(
  action: (input: TInput) => Promise<ActionResult<TOutput>>,
  options: UseActionOptions<TInput, TOutput> = {},
) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const toast = useToast();
  const optionsRef = React.useRef(options);
  React.useEffect(() => {
    optionsRef.current = options;
  });

  const run = React.useCallback(
    <TForm extends FieldValues>(input: TInput, setFormError?: UseFormSetError<TForm>) =>
      new Promise<ActionResult<TOutput>>((resolve) => {
        setError(null);
        startTransition(async () => {
          const result = await action(input);
          if (result.ok) {
            if (optionsRef.current.successMessage) toast.success(optionsRef.current.successMessage);
            await optionsRef.current.onSuccess?.(result.data, input);
          } else {
            setError(result.error.message);
            if (result.error.fieldErrors && setFormError) {
              for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
                setFormError(field as Path<TForm>, { message: messages[0] });
              }
            }
            if (optionsRef.current.toastError !== false) toast.error(result.error.message);
            optionsRef.current.onError?.(result.error);
          }
          resolve(result);
        });
      }),
    [action, toast],
  );

  return { run, pending, error };
}
