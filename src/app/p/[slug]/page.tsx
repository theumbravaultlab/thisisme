import type { Metadata } from "next";
import Link from "next/link";
import { fetchPublicProfile } from "@/lib/supabaseServer";
import { PublicProfileView } from "@/components/PublicProfileView";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await fetchPublicProfile(slug);
  const name = profile?.data.name || "thisisme";
  return {
    title: `${name} · thisisme`,
    description: `${name}'s profile on thisisme.`,
    openGraph: {
      title: `${name} · thisisme`,
      description: `${name}'s profile on thisisme.`,
      type: "profile",
    },
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await fetchPublicProfile(slug);

  if (!profile) {
    return (
      <main className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <div className="text-5xl">🔍</div>
        <h1 className="text-2xl font-semibold">Profile not found</h1>
        <p className="text-sm text-fg-muted">
          This link may be private, disabled, or mistyped.
        </p>
        <Link
          href="/"
          className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Make your own thisisme
        </Link>
      </main>
    );
  }

  return <PublicProfileView profile={profile} />;
}
