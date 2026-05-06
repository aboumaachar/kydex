/** @type {import('next').NextConfig} */
const isStaticExport = process.env.KYDEX_STATIC_EXPORT === '1';

const nextConfig = {
	...(isStaticExport
		? {
				output: 'export',
				trailingSlash: true,
				images: {
					unoptimized: true,
				},
			}
		: {}),
	async redirects() {
		return [
			{
				source: '/kydex',
				destination: '/',
				permanent: false,
			},
		];
	},
};

module.exports = nextConfig;
