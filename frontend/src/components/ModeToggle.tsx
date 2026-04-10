import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = (event: React.MouseEvent<HTMLButtonElement>) => {
    const isAppearanceTransition =
      // @ts-ignore
      document.startViewTransition &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (!isAppearanceTransition) {
      setTheme(theme === "light" ? "dark" : "light")
      return
    }

    const x = event.clientX
    const y = event.clientY
    
    document.documentElement.style.setProperty("--x", `${x}px`)
    document.documentElement.style.setProperty("--y", `${y}px`)

    // @ts-ignore
    document.startViewTransition(async () => {
      setTheme(theme === "light" ? "dark" : "light")
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="rounded-full w-9 h-9"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
