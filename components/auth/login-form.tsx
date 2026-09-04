"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRightIcon } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { AuthSocialButtons } from "@/components/auth/auth-social-buttons"
import { AuthDivider } from "@/components/auth/auth-divider"
import { PasswordInput } from "@/components/auth/password-input"
import { authClient } from "@/lib/auth-client"

function LoginForm() {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)
  const [rememberMe, setRememberMe] = React.useState(true)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError(null)
    setPending(true)

    const { error: signInError } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
      rememberMe,
      // Absolute, so Better Auth never has to infer the origin.
      callbackURL: `${window.location.origin}/`,
    })

    if (signInError) {
      setPending(false)
      // Better Auth answers the same way for a wrong password and an unknown
      // address on purpose — don't dress it up into something more specific.
      setError(signInError.message ?? "That email and password didn't match.")
      return
    }

    router.push("/")
    router.refresh()
  }

  return (
    <div className="flex flex-col">
      <h1 className="text-[32px] leading-tight">Welcome back</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">
        Sign in to pick up where you left off.
      </p>

      <AuthSocialButtons className="mt-8" onError={setError} />
      <AuthDivider />

      <form onSubmit={onSubmit} className="flex flex-col">
        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="h-11.5 bg-card text-[15px] md:text-[15px] dark:bg-card"
          />
        </div>

        <div className="mt-3.5 flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-4">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/reset-password"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            placeholder="Enter your password"
          />
        </div>

        <div className="mt-4 flex items-center gap-2.5">
          <Checkbox
            id="remember"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked === true)}
            className="size-4.5 cursor-pointer"
          />
          <Label htmlFor="remember" className="cursor-pointer font-normal">
            Keep me signed in for 30 days
          </Label>
        </div>

        <Button
          type="submit"
          disabled={pending}
          className="mt-5 h-12 gap-2 text-[15px] font-semibold"
        >
          {pending ? <Spinner /> : null}
          Sign in
          {pending ? null : <ArrowRightIcon data-icon="inline-end" />}
        </Button>
      </form>

      <p className="mt-5 text-center text-[15px] text-muted-foreground">
        New to Lumen?{" "}
        <Link
          href="/register"
          className="font-bold text-foreground transition-opacity hover:opacity-80"
        >
          Create an account
        </Link>
      </p>
    </div>
  )
}

export { LoginForm }
