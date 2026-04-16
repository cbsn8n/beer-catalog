"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { OPEN_LOGIN_EVENT } from "@/components/header";

export function LoginModalTriggerButton({
  children,
  size = "lg",
}: {
  children: ReactNode;
  size?: "default" | "sm" | "lg" | "xs" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
}) {
  return (
    <Button
      size={size}
      onClick={() => {
        window.dispatchEvent(new Event(OPEN_LOGIN_EVENT));
      }}
    >
      {children}
    </Button>
  );
}
