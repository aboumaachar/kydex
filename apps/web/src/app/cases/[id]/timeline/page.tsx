import PageClient from './page-client';

export const dynamicParams = false;

type CaseTimelinePageProps = {
  params: { id: string };
};

export function generateStaticParams() {
  return [];
}

export default function CaseTimelinePage({ params }: Readonly<CaseTimelinePageProps>) {
  return <PageClient params={params} />;
}