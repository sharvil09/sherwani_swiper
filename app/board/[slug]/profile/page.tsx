import ProfileClient from "@/components/ProfileClient";

export const dynamic = "force-dynamic";

export default function ProfilePage({ params }: { params: { slug: string } }) {
  return <ProfileClient slug={params.slug} />;
}
