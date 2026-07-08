"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useAuth } from "@/lib/auth/use-auth";
import { registerSchema, type RegisterInput } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/shared/field";
import { useToastError } from "@/components/ui/use-toast";

export default function RegisterPage() {
  const { register: registerAccount } = useAuth();
  const router = useRouter();
  const toastError = useToastError();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", workspaceName: "" },
  });

  async function onSubmit(values: RegisterInput) {
    try {
      await registerAccount({
        name: values.name,
        email: values.email,
        password: values.password,
        workspaceName: values.workspaceName?.trim() || undefined,
      });
      router.replace("/dashboard");
    } catch (e) {
      toastError(e, "Could not create your account");
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Set up a new Developer Playground workspace in seconds.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Full name" htmlFor="name" error={errors.name?.message} required>
          <Input id="name" autoComplete="name" placeholder="Jane Developer" {...register("name")} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message} required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            {...register("email")}
          />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message} required>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            {...register("password")}
          />
        </Field>
        <Field
          label="Workspace name"
          htmlFor="workspaceName"
          error={errors.workspaceName?.message}
          hint="Optional — defaults to your name's workspace."
        >
          <Input
            id="workspaceName"
            autoComplete="organization"
            placeholder="Otapp QA Workspace"
            {...register("workspaceName")}
          />
        </Field>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Create account
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
          Sign in
        </Link>
      </div>
    </div>
  );
}
