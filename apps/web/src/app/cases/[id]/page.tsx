import PageClient from './page-client';

export const dynamicParams = false;

type CasePageProps = {
	params: { id: string };
};

export function generateStaticParams() {
	return [];
}

export default function CaseDetailPage({ params }: Readonly<CasePageProps>) {
	return <PageClient params={params} />;
}
