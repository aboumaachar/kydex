export const dynamicParams = false;

export function generateStaticParams() {
	return [];
}

export default function DataSourceRecordLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return children;
}