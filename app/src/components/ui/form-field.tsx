import * as React from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + hint/error, wiring aria-describedby for screen readers. */
export function FormField({ label, htmlFor, hint, error, required, className, children }: FormFieldProps) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-800">
        {label}
        {required ? (
          <span className="ml-0.5 text-danger-600" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      <FormFieldContext.Provider value={{ describedBy: [errorId, hintId].filter(Boolean).join(" ") || undefined }}>
        {children}
      </FormFieldContext.Provider>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const FormFieldContext = React.createContext<{ describedBy?: string }>({});
export function useFormFieldAria() {
  return React.useContext(FormFieldContext);
}
