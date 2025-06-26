// Vercel Serverless Function - api/lottie.js
// This function acts as a reliable, cached proxy to the LottieFiles API.

const LOTTIE_API_URL = 'https://lottiefiles.com/api/v2';

// In-memory cache to reduce API calls for popular/repeated queries
const cache = new Map();

export default async function handler(request, response) {
    // Set CORS headers to allow requests from any origin (like Obsidian)
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
        // This is the correct endpoint structure based on the MCP server's logic
        const lottieApiEndpoint = query 
            ? `${LOTTIE_API_URL}/search?q=${encodeURIComponent(query)}&type=${type}`
            : `${LOTTIE_API_URL}/popular?type=${type}`;

        const apiResponse = await fetch(lottieApiEndpoint);

        if (!apiResponse.ok) {
            // Forward the exact error from LottieFiles for better debugging
            const errorBody = await apiResponse.text();
            console.error(`LottieFiles API Error (Status: ${apiResponse.status}):`, errorBody);
            return response.status(apiResponse.status).json({ error: `LottieFiles API responded with status: ${apiResponse.status}` });
        }

        const data = await apiResponse.json();

        // Cache the successful response
        cache.set(cacheKey, { data, timestamp: Date.now() });

        // Forward the successful response to the client
        return response.status(200).json(data);

    } catch (error) {
        console.error('Error proxying to LottieFiles API:', error);
        return response.status(500).json({ error: 'Failed to fetch data from LottieFiles API.' });
    }
}
