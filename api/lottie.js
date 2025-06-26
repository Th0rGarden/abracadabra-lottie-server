// [SOLUTION-ID: 035]
// Vercel Serverless Function - api/lottie.js
// This function acts as a reliable, cached proxy to the LottieFiles API.

const LOTTIE_API_BASE = 'https://lottiefiles.com/api/v2';

// In-memory cache to reduce API calls
const cache = new Map();

export default async function handler(request, response) {
    // Set CORS headers
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    const { searchParams } = new URL(request.url, `https://${request.headers.host}`);
    const query = searchParams.get('q') || '';

    const cacheKey = query || 'popular';
    const cachedData = cache.get(cacheKey);

    if (cachedData && (Date.now() - cachedData.timestamp < 3600000)) { // 1 hour cache
        return response.status(200).json(cachedData.data);
    }

    try {
        let lottieApiEndpoint;
        if (query) {
            lottieApiEndpoint = `${LOTTIE_API_BASE}/search?q=${encodeURIComponent(query)}&type=animation`;
        } else {
            // This is the corrected endpoint for popular/featured animations
            lottieApiEndpoint = `https://assets.lottiefiles.com/featured.json`;
        }

        const apiResponse = await fetch(lottieApiEndpoint);

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            console.error(`LottieFiles API Error (Status: ${apiResponse.status}):`, errorBody);
            return response.status(apiResponse.status).json({ error: `LottieFiles API responded with status: ${apiResponse.status}` });
        }

        const data = await apiResponse.json();
        
        // The data structure is different for search vs. popular
        let animations;
        if (query) {
            animations = data?.data?.results?.data || [];
        } else {
            animations = Array.isArray(data) ? data : [];
        }

        const responseData = { animations };
        cache.set(cacheKey, { data: responseData, timestamp: Date.now() });

        return response.status(200).json(responseData);

    } catch (error) {
        console.error('Error proxying to LottieFiles API:', error);
        return response.status(500).json({ error: 'Failed to fetch data from LottieFiles API.' });
    }
}
