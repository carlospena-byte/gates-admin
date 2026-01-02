import type { ReactNode } from "react";

import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/lib/utils";

export function AuthLayout({
  children,
  title,
  description,
  className,
}: {
  children: ReactNode;
  title: string;
  description?: string;
  className?: string;
}) {
  const { t } = useI18n();

  return (
    <div className={cn("min-h-screen", className)}>
      <div className="container relative grid min-h-screen flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0">
        <div className="relative hidden h-full flex-col bg-muted p-10 text-muted-foreground lg:flex dark:border-r">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background/70 to-muted" />
          <div className="relative z-10 flex items-center text-lg font-medium text-foreground">
            gates-admin
          </div>
          <div className="relative z-10 mt-auto space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {t("authLayout.sidebar.title")}
            </h2>
            <p className="text-sm">{t("authLayout.sidebar.subtitle")}</p>
          </div>
        </div>

        <div className="lg:p-10">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[420px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {description ? (
                <p className="text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
