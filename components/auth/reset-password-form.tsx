"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRightIcon, CheckIcon, MailIcon } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { PasswordInput } from "@/components/auth/password-input"
import {
  MIN_PASSWORD_LENGTH,
  PasswordStrength,
} from "@/components/auth/password-strength"
import { authClient } from "@/lib/auth-client"

/** Centred link back to sign-in, on every state of this screen. */
function BackToSignIn() {
  return (
    <p className="mt-5 text-center">
      <Link
        href="/login"
        className="text-[15px] font-bold text-foreground transition-opacity hover:opacity-80"
      >
        Back to sign in
      </Link>
    </p>
  )
}

/**
 * One route, four states — Better Auth mails a link back to this same URL:
 *
 *   request → sent      the form in the export; asks for an address
 *   reset               arrived with ?token=, so set the new password
 *   done                password changed, go and sign in
 *   invalid             ?error= from an expired or reused link
 */
function ResetPasswordForm({
  token,
  linkError,
}: {
  token?: string
  linkError?: string
}) {
  const router = useRouter()
  const [stage, setStage] = React.useState<
    "request" | "sent" | "reset" | "done" | "invalid"
  >(linkError ? "invalid" : token ? "reset" : "request")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  async function sendLink(address: string) {
    setError(null)
    setPending(true)
    const { error: requestError } = await authClient.requestPasswordReset({
      email: address,
      // Absolute, and back to this page — the token rides in the query string.
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setPending(false)
    if (requestError) {
      setError(requestError.message ?? "We couldn't send that link.")
      return
    }
    setStage("sent")
  }

  async function onRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const address = String(new FormData(event.currentTarget).get("email"))
    setEmail(address)
    await sendLink(address)
  }

  async function onReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token,
    })
    setPending(false)
    if (resetError) {
      setError(resetError.message ?? "That link is no longer valid.")
      return
    }
    setStage("done")
  }

  if (stage === "sent") {
    return (
      <div className="flex flex-col">
        <span className="grid size-11 place-items-center rounded-xl bg-hover text-foreground">
          <MailIcon className="size-5" />
        </span>
        <h1 className="mt-5 text-[32px] leading-tight">Check your email</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          If an account uses <span className="text-foreground">{email}</span>, a
          reset link is on its way. It expires in an hour.
        </p>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => sendLink(email)}
          className="mt-6 h-12 gap-2 bg-card text-[15px] font-semibold"
        >
          {pending ? <Spinner /> : null}
          Send it again
        </Button>
        <BackToSignIn />
      </div>
    )
  }

  if (stage === "done") {
    return (
      <div className="flex flex-col">
        <span className="grid size-11 place-items-center rounded-xl bg-success/15 text-success">
          <CheckIcon className="size-5" strokeWidth={3} />
        </span>
        <h1 className="mt-5 text-[32px] leading-tight">Password updated</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Every other session has been signed out. Use the new password from
          here on.
        </p>
        <Button
          nativeButton={false}
          className="mt-6 h-12 gap-2 text-[15px] font-semibold"
          render={<Link href="/login" />}
        >
          Sign in
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </div>
    )
  }

  if (stage === "invalid") {
    return (
      <div className="flex flex-col">
        <h1 className="text-[32px] leading-tight">That link has expired</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Reset links last an hour and work once. Ask for a fresh one and it
          will be in your inbox in a moment.
        </p>
        <Button
          onClick={() => {
            setStage("request")
            setError(null)
            router.replace("/reset-password")
          }}
          className="mt-6 h-12 gap-2 text-[15px] font-semibold"
        >
          Send a new link
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
        <BackToSignIn />
      </div>
    )
  }

  if (stage === "reset") {
    return (
      <div className="flex flex-col">
        <h1 className="text-[32px] leading-tight">Choose a new password</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Pick something you haven&rsquo;t used on Lumen before.
        </p>

        <form onSubmit={onReset} className="mt-6 flex flex-col">
          {error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password">New password</Label>
            <PasswordInput
              id="new-password"
              name="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <PasswordStrength value={password} />
          </div>

          <Button
            type="submit"
            disabled={pending}
            className="mt-5 h-12 gap-2 text-[15px] font-semibold"
          >
            {pending ? <Spinner /> : null}
            Reset password
            {pending ? null : <ArrowRightIcon data-icon="inline-end" />}
          </Button>
        </form>
        <BackToSignIn />
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <h1 className="text-[32px] leading-tight">Reset your password</h1>
      {/* `text-wrap` overrides the global `pretty`, which would rebalance the
          two lines away from the export's greedy break. */}
      <p className="mt-2 text-[15px] text-muted-foreground [text-wrap:wrap]">
        Enter the email on your account and we&rsquo;ll send a link to reset
        your password.
      </p>

      <form onSubmit={onRequest} className="mt-6 flex flex-col">
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

        <Button
          type="submit"
          disabled={pending}
          className="mt-5 h-12 gap-2 text-[15px] font-semibold"
        >
          {pending ? <Spinner /> : null}
          Send reset link
          {pending ? null : <ArrowRightIcon data-icon="inline-end" />}
        </Button>
      </form>

      <BackToSignIn />
    </div>
  )
}

export { ResetPasswordForm }
