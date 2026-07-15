import { redirect } from 'next/navigation';

interface SlugPageProps {
  params: Promise<{ slug: string }>;
}

export default async function SlugPage({ params }: SlugPageProps) {
  const { slug } = await params;

  // Redirect to table selection or default table
  redirect(`/${slug}/mesa/1`);
}
