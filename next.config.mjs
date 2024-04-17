/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
        return [
            {
              source: '/(.*)',
              headers: [
                {
                  key: 'Content-Security-Policy',
                  value: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; media-src 'self'; frame-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; manifest-src 'self'; prefetch-src 'self'; worker-src 'self'",
                },
                {
                  key: 'viewport',
                  value: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
                },
              ],
            },
          ]
    }
};

export default nextConfig;
