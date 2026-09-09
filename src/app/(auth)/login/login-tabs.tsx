"use client";

import * as React from "react";
import { Segmented } from "@/components/ui/tabs";
import { PhoneLoginForm } from "@/components/forms/phone-login-form";
import { EmailLoginForm } from "@/components/forms/email-login-form";

export function LoginTabs({ next }: { next?: string }) {
  const [tab, setTab] = React.useState<"phone" | "email">("phone");
  return (
    <div className="space-y-5">
      <Segmented
        aria-label="Sign-in method"
        value={tab}
        onChange={setTab}
        options={[
          { value: "phone", label: "Mobile OTP" },
          { value: "email", label: "Email" },
        ]}
        className="w-full"
      />
      {tab === "phone" ? <PhoneLoginForm mode="login" next={next} /> : <EmailLoginForm next={next} />}
    </div>
  );
}
