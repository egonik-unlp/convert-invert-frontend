import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isMock } from "@/lib/data";
import { toggleMockRole } from "@/lib/data/mock";
import { useLocale, useT, type Locale } from "@/lib/i18n";
import { useTheme, type Theme } from "@/lib/theme";
import { Avatar } from "@/components/Avatar";
import { menuContent, menuItem } from "@/components/collection/CollectionMenu";

const LANGS: { id: Locale; label: string }[] = [
  { id: "es", label: "Español" },
  { id: "en", label: "English" },
];

/** Language, theme and logging out. */
export function ProfileMenu() {
  const t = useT();
  const { me, logout } = useAuth();
  const { locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  if (!me) return null;

  const radio = "flex cursor-default select-none items-center gap-2 rounded-md py-1.5 pl-7 pr-2 text-sm outline-none data-[highlighted]:bg-hover relative";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="inline-flex max-w-[9rem] items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 text-xs text-muted-foreground hover:bg-hover hover:text-foreground"
        aria-label={t.profile.account(me.name)}
      >
        <Avatar name={me.name} src={me.avatarUrl} />
        <span className="truncate">{me.name}</span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className={menuContent}>
          <div className="px-2 py-1.5">
            <p className="truncate text-sm">{me.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {me.email} · {me.role === "admin" ? t.common.admin : t.common.member}
            </p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Label className="px-2 pt-1 text-2xs text-muted-foreground">{t.profile.language}</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={locale} onValueChange={(value) => setLocale(value as Locale)}>
            {LANGS.map((lang) => (
              <DropdownMenu.RadioItem key={lang.id} value={lang.id} className={radio} lang={lang.id}>
                <DropdownMenu.ItemIndicator className="absolute left-2">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                </DropdownMenu.ItemIndicator>
                {lang.label}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Label className="px-2 pt-2 text-2xs text-muted-foreground">{t.profile.theme}</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
            {(["light", "dark"] as Theme[]).map((option) => (
              <DropdownMenu.RadioItem key={option} value={option} className={radio}>
                <DropdownMenu.ItemIndicator className="absolute left-2">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                </DropdownMenu.ItemIndicator>
                {option === "light" ? t.profile.light : t.profile.dark}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          {isMock ? (
            <DropdownMenu.Item className={menuItem} onSelect={toggleMockRole}>
              <UserRound aria-hidden />
              {me.role === "admin" ? "Mock: Lu (member)" : "Mock: Gonik (admin)"}
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Item className={menuItem} onSelect={() => void logout()}>
            <LogOut aria-hidden />
            {t.profile.logout}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
