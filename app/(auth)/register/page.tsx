import type { Metadata } from "next"

import { RegisterForm } from "@/components/auth/register-form"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: `Create your account · ${siteConfig.name}`,
  description: "Free to join. Learn, teach, or do both from one account.",
}

export default function RegisterPage() {
  return <RegisterForm />
}
