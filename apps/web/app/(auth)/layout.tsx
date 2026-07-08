import { LogoMark } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <LogoMark size={36} gradientId="dp-logo-auth" />
          <span className="text-lg font-semibold">Developer Playground</span>
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-semibold leading-tight">
            Dynamic API Integration Sandbox
          </h2>
          <p className="max-w-md text-primary-foreground/70">
            Build mock endpoints, rule-based responses, and outbound webhooks so your team can test
            integrations before the real provider is ready.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/50">
          Simulate success, failure, timeout, delayed and rule-driven responses.
        </p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
