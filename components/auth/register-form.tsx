"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRightIcon,
  GraduationCapIcon,
  PresentationIcon,
} from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { AuthDivider } from "@/components/auth/auth-divider"
import { AuthSocialButtons } from "@/components/auth/auth-social-buttons"
import { PasswordInput } from "@/components/auth/password-input"
import {
  MIN_PASSWORD_LENGTH,
  PasswordStrength,
} from "@/components/auth/password-strength"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

/** Mirrors `user.additionalFields.intent` in `lib/auth.ts`. */
const intents = [
  {
    value: "LEARNING",
    icon: GraduationCapIcon,
    title: "Learn",
    body: "Take courses and earn certificates",
  },
  {
    value: "TEACHING",
    icon: PresentationIcon,
    title: "Teach",
    body: "Build and sell your own courses",
  },
] as const

type Intent = (typeof intents)[number]["value"]

function RegisterForm() {
  const router = useRouter()
  const [intent, setIntent] = React.useState<Intent>("LEARNING")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError(null)
    setPending(true)

    const { error: signUpError } = await authClient.signUp.email({
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
      intent,
      callbackURL: `${window.location.origin}/`,
    })

    if (signUpError) {
      setPending(false)
      setError(signUpError.message ?? "We couldn't create that account.")
      return
    }

    router.push("/")
    router.refresh()
  }

  return (
    /* The register form is ~260px taller than sign-in, which is the difference
       between fitting a laptop viewport and scrolling. These three variables
       carry the export's rhythm at full height and tighten it once the
       viewport gets short — one place to tune, instead of a media query on
       every margin. */
    <div className="flex flex-col [--auth-block:32px] [--auth-cta:20px] [--auth-gap:14px] [@media(max-height:870px)]:[--auth-block:14px] [@media(max-height:870px)]:[--auth-cta:10px] [@media(max-height:870px)]:[--auth-gap:8px] [@media(max-height:940px)_and_(min-height:871px)]:[--auth-block:20px] [@media(max-height:940px)_and_(min-height:871px)]:[--auth-cta:12px] [@media(max-height:940px)_and_(min-height:871px)]:[--auth-gap:10px]">
      <h1 className="text-[32px] leading-tight [@media(max-height:870px)]:text-[28px]">
        Create your account
      </h1>
      <p className="mt-2 text-[15px] text-muted-foreground [@media(max-height:870px)]:mt-1.5">
        Free to join. Learn, teach, or do both from one account.
      </p>

      <AuthSocialButtons
        className="mt-[var(--auth-block)]"
        onError={setError}
      />
      <AuthDivider className="my-[calc(var(--auth-block)*0.75)]" />

      <form onSubmit={onSubmit} className="flex flex-col">
        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {/* A radiogroup rather than two buttons: arrow keys move between the
            options and the choice is announced as one control. */}
        <div
          role="radiogroup"
          aria-label="I want to"
          className="flex flex-col gap-1.5"
        >
          <span className="text-sm font-medium">I want to</span>
          <div className="grid grid-cols-2 gap-3">
            {intents.map((option) => {
              const selected = intent === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setIntent(option.value)}
                  className={cn(
                    "flex cursor-pointer flex-col rounded-xl border p-4 text-left transition-colors [@media(max-height:940px)_and_(min-height:871px)]:p-3",
                    selected
                      ? "border-primary bg-hover ring-1 ring-primary"
                      : "border-border bg-card hover:bg-hover"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-8 place-items-center rounded-lg transition-colors [@media(max-height:870px)]:size-7",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-hover text-muted-foreground"
                    )}
                  >
                    <option.icon className="size-4" />
                  </span>
                  <span className="mt-3 text-[15px] font-bold [@media(max-height:870px)]:mt-1.5 [@media(max-height:940px)_and_(min-height:871px)]:mt-2">
                    {option.title}
                  </span>
                  <span className="mt-1 text-[13px] leading-snug text-muted-foreground [@media(max-height:870px)]:hidden">
                    {option.body}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-[var(--auth-gap)] flex flex-col gap-1.5 [@media(max-height:870px)]:gap-1">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            required
            placeholder="Ada Lovelace"
            className="h-11.5 bg-card text-[15px] md:text-[15px] dark:bg-card"
          />
        </div>

        <div className="mt-[var(--auth-gap)] flex flex-col gap-1.5 [@media(max-height:870px)]:gap-1">
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

        <div className="mt-[var(--auth-gap)] flex flex-col gap-1.5 [@media(max-height:870px)]:gap-1">
          <Label htmlFor="new-password">Password</Label>
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

        <p className="mt-[var(--auth-gap)] text-[13px] leading-relaxed text-muted-foreground [@media(max-height:870px)]:leading-snug">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="text-foreground underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-foreground underline">
            Privacy Policy
          </Link>
          .
        </p>

        <Button
          type="submit"
          disabled={pending}
          className="mt-[var(--auth-cta)] h-12 gap-2 text-[15px] font-semibold"
        >
          {pending ? <Spinner /> : null}
          Create account
          {pending ? null : <ArrowRightIcon data-icon="inline-end" />}
        </Button>
      </form>

      <p className="mt-[var(--auth-cta)] text-center text-[15px] text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-bold text-foreground transition-opacity hover:opacity-80"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}

export { RegisterForm }
