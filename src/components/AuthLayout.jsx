import React from "react";
import BrandMark from "@/components/east/BrandMark";
import { SCHOOL_NAME, PROGRAM_NAME } from "@/lib/schoolConfig";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="aurora-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 md:pl-40">
      <aside className="glass-panel fixed inset-y-0 left-0 hidden w-28 flex-col items-center px-4 py-8 md:flex">
        <BrandMark compact />
        <span className="mt-3 text-center text-xs tracking-wider text-muted-foreground">{SCHOOL_NAME}<br />{PROGRAM_NAME}</span>
      </aside>
      <div className="relative w-full max-w-xl">
        <div className="glass-panel absolute -left-5 -right-5 -top-5 h-full rounded-3xl opacity-35" />
        <div className="glass-panel absolute -left-3 -right-3 -top-3 h-full rounded-3xl opacity-55" />
        <div className="glass-panel relative rounded-3xl p-6 sm:p-10">
          <div className="mb-9 text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan shadow-neon-cyan">
              <Icon className="h-7 w-7" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-2 text-lg text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="rounded-2xl border border-border/80 bg-background/35 p-5 shadow-xl backdrop-blur-xl sm:p-8">{children}</div>
        </div>
        {footer && <p className="glass-panel relative mt-8 rounded-2xl p-5 text-center text-sm text-muted-foreground">{footer}</p>}
      </div>
    </div>
  );
}