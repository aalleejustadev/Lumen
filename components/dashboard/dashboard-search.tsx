"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { SearchIcon } from "lucide-react"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"
import { dashboardNav } from "@/lib/config/dashboard"

/**
 * The header's search. It looks like the input in the export, but it opens a
 * command palette — a field advertising ⌘K that did nothing on Enter would be
 * a promise the app can't keep yet. Course search joins the palette when the
 * catalog is wired to the database.
 */
function DashboardSearch() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-full max-w-[458px] min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg border bg-card pr-3 pl-3.5 text-left transition-colors hover:bg-hover"
      >
        <SearchIcon className="size-4 shrink-0 text-subtle-foreground" />
        <span className="flex-1 truncate text-sm text-muted-foreground">
          Search...
        </span>
        <Kbd className="hidden shrink-0 sm:flex">⌘ K</Kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        {/* The generated `CommandDialog` doesn't wrap its children in the cmdk
            root, so the input has no store to subscribe to without this. */}
        <Command>
          <CommandInput placeholder="Search Lumen..." />
          <CommandList>
            <CommandEmpty>Nothing matches that yet.</CommandEmpty>
            {dashboardNav.map((group) => (
              <CommandGroup key={group.title} heading={group.title}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={item.title}
                    onSelect={() => go(item.href)}
                    className="cursor-pointer"
                  >
                    <item.icon />
                    {item.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}

export { DashboardSearch }
