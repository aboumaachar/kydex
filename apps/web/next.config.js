/** @type {import('next').NextConfig} */
const nextConfig = {
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
