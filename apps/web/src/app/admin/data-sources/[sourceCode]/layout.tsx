export const dynamicParams = false;

export function generateStaticParams() {
	return [];
}

export default function DataSourceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return children;
}