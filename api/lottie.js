// Vercel Serverless Function - api/lottie.js

// This function acts as a proxy to the LottieFiles API, adding caching.
// It's designed to be deployed on Vercel's free tier.

const LOTTIE_API_URL = 'https://lottiefiles.com/api/v2';

// In-memory cache to reduce API calls for popular/repeated queries
const cache = new Map();

export default async function handler(request, response) {
    // Set CORS headers to allow requests from any origin (or lock it down if you prefer)
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    const { searchParams } = new URL(request.url, `https://${request.headers.host}`);
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'animation';

    const cacheKey = `${query}-${type}`;
    const cachedData = cache.get(cacheKey);

    // Serve from cache if available and not older than 1 hour
    if (cachedData && (Date.now() - cachedData.timestamp < 3600000)) {
        return response.status(200).json(cachedData.data);
    }

    try {
        const lottieApiEndpoint = query 
            ? `${LOTTIE_API_URL}/search?q=${encodeURIComponent(query)}&type=${type}`
            : `${LOTTIE_API_URL}/popular?type=${type}`;

        const apiResponse = await fetch(lottieApiEndpoint);

        if (!apiResponse.ok) {
            throw new Error(`LottieFiles API responded with status: ${apiResponse.status}`);
        }

        const data = await apiResponse.json();

        // Cache the successful response
        cache.set(cacheKey, { data, timestamp: Date.now() });

        // Forward the response to the client
        return response.status(200).json(data);

    } catch (error) {
        console.error('Error fetching from LottieFiles API:', error);
        return response.status(500).json({ error: 'Failed to fetch data from LottieFiles API.' });
    }
}
