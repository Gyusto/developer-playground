"use client";

import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth/use-auth";
import { API_BASE_URL } from "@/lib/api-client";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SimpleSelect } from "@/components/ui/select";
import { Field } from "@/components/shared/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Your account, workspace and appearance preferences." />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input value={user?.name ?? ""} readOnly />
          </Field>
          <Field label="Email">
            <Input value={user?.email ?? ""} readOnly />
          </Field>
          <Field label="Role">
            <Input value={user?.role ?? "—"} readOnly />
          </Field>
          <Field label="Workspace">
            <Input value={user?.workspaceName ?? "—"} readOnly />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <Field label="Theme" className="max-w-xs">
            <SimpleSelect
              value={theme ?? "system"}
              onValueChange={setTheme}
              options={[
                { value: "system", label: "System" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="w-40 text-muted-foreground">Portal API base URL</span>
            <code className="font-mono text-xs">{API_BASE_URL}</code>
          </div>
          <Separator className="my-3" />
          <Button variant="outline" onClick={logout}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
