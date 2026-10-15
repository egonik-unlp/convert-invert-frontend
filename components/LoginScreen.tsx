import { useEffect, useState } from "react";
import { loginUrl } from "@/lib/api-client";
import { useLocale, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type LoginError = "not_invited" | "spotify" | "state";

function readLoginError(): LoginError | null {
  const value = new URLSearchParams(window.location.search).get("login_error");
  return value === "not_invited" || value === "spotify" || value === "state" ? value : null;
}

export function LoginScreen() {
  const t = useT();
  const { locale, setLocale } = useLocale();
  const [error] = useState<LoginError | null>(readLoginError);

  // Drop ?login_error from the address bar so a reload doesn't show the error again.
  useEffect(() => {
    if (!error) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("login_error");
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="flex w-full max-w-xs flex-col items-start gap-4">
        <h1 className="text-[0.95rem] font-semibold tracking-tight">
          convert<span className="px-px font-normal text-muted-foreground">/</span>invert
        </h1>
        <p className="text-xl font-medium leading-snug">{t.login.tagline}</p>
        {error ? (
          <p role="alert" className="text-sm text-bad">
            {t.login.errors[error]}
          </p>
        ) : null}
        <a
          href={loginUrl()}
          className="inline-flex h-9 w-full items-center justify-center rounded-md bg-foreground px-4 text-sm font-medium text-background hover:opacity-90"
        >
          {t.login.login}
        </a>
        <p className="text-sm text-muted-foreground">{t.login.note}</p>
        <div className="flex w-full gap-1" role="group" aria-label={t.login.languageGroup}>
          {(["es", "en"] as const).map((option) => (
            <button
              key={option}
              type="button"
              lang={option}
              onClick={() => setLocale(option)}
              aria-pressed={locale === option}
              className={cn(
                "flex-1 rounded-md border px-2 py-1.5 text-xs",
                locale === option ? "border-foreground text-foreground" : "border-line text-muted-foreground hover:text-foreground",
              )}
            >
              {option === "es" ? "Español" : "English"}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
