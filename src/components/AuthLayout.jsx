import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme !== "light";

  return (<>
    <div className="login-background" />
    <div className="min-h-screen flex items-center justify-center bg-transparent px-4">
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="fixed right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground"
        aria-label={isDark ? "Activer le mode clair" : "Activer le mode sombre"}
        title={isDark ? "Mode clair" : "Mode sombre"}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      <div className="w-full max-w-md honeycomb-card">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
            <Icon className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
    </>
  );
}
