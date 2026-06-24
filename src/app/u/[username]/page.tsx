import type { Metadata } from "next";
import { after } from "next/server";
import Link from "next/link";
import { LinkedInMark, XMark } from "@/components/brand-icons";
import { UActions } from "@/components/u-actions";
import { buttonVariants } from "@/components/ui/button";
import { isValidGitHubUsername } from "@/lib/github";
import { cn } from "@/lib/utils";

const APP =
  process.env.AUTH_URL ?? "https://gh-activity-plotter.securityronin.com";

type Params = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  if (!isValidGitHubUsername(username)) return { title: "Inkblot" };
  const img = `${APP}/u/${username}/inkblot.png`;
  const title = `${username}'s code inkblot`;
  const description = `What does ${username}'s GitHub activity look like? Made with Inkblot.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: img, width: 2240, height: 1120 }],
    },
    twitter: { card: "summary_large_image", title, description, images: [img] },
  };
}

export default async function PublicInkblotPage({ params }: Params) {
  const { username } = await params;

  if (!isValidGitHubUsername(username)) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <p className="text-muted-foreground">That isn&apos;t a valid GitHub username.</p>
        <Link href="/" className={cn(buttonVariants())}>
          Go to Inkblot
        </Link>
      </main>
    );
  }

  const img = `/u/${username}/inkblot.png`;
  const pageUrl = `${APP}/u/${username}`;

  // Pre-warm the image cache after the response so the OG scrape (and the
  // README embed) hit a warm CDN entry instead of a cold ~render. The human's
  // <img> load below also warms it; this covers a scraper-first page hit.
  after(async () => {
    try {
      await fetch(`${APP}/u/${username}/inkblot.png`, { cache: "no-store" });
    } catch {
      // best-effort warm; ignore failures
    }
  });
  const embed = `![${username}'s code inkblot](${APP}/u/${username}/inkblot.png)`;
  const xHref = `https://x.com/intent/post?text=${encodeURIComponent(
    `${username}'s code inkblot 🦇 — what's yours?`,
  )}&url=${encodeURIComponent(pageUrl)}`;
  const liHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    pageUrl,
  )}`;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-8 px-6 py-10">
      <div className="ring-border/60 bg-card/40 w-full overflow-hidden rounded-xl border shadow-2xl ring-1">
        {/* eslint-disable-next-line @next/next/no-img-element -- generated, dynamic PNG */}
        <img src={img} alt={`${username}'s code inkblot`} className="h-auto w-full" />
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          <span className="text-primary">{username}</span>&apos;s code inkblot
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={xHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <XMark className="size-4" /> Share
          </a>
          <a
            href={liHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <LinkedInMark className="size-4" /> Share
          </a>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground")}
          >
            Sign in to include private repos →
          </Link>
        </div>
      </div>

      <UActions embed={embed} />
    </main>
  );
}
