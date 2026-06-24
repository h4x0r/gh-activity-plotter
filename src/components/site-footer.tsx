import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="text-muted-foreground border-t px-6 py-4 text-center text-xs">
      <Link href="/privacy" className="hover:text-foreground">
        Privacy Policy
      </Link>
      <span className="mx-2">·</span>
      <Link href="/terms" className="hover:text-foreground">
        Terms of Service
      </Link>
      <span className="mx-2">·</span>
      <span>© 2026 Security Ronin Ltd</span>
    </footer>
  );
}
