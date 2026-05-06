import PageClient from './page-client';

export const dynamicParams = false;

type CaseEvidencePageProps = {
  params: { id: string };
};

export function generateStaticParams() {
  return [];
}

export default function CaseEvidencePage({ params }: Readonly<CaseEvidencePageProps>) {
  return <PageClient params={params} />;
}