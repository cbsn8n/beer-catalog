"use client";

import { useEffect, useRef } from "react";

export function TelegramLoginWidget({
  botUsername,
  authUrl,
}: {
  botUsername: string;
  authUrl: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !botUsername || !authUrl) return;

    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "10");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-auth-url", authUrl);

    containerRef.current.appendChild(script);
  }, [botUsername, authUrl]);

  return <div ref={containerRef} className="min-h-10" />;
}

