import type { Metadata } from "next"

import { LoginForm } from "@/components/auth/login-form"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Sign in · ${siteConfig.name}`,
  description: "Sign in to pick up where you left off.",
}

export default function LoginPage() {
  return <LoginForm />
}
