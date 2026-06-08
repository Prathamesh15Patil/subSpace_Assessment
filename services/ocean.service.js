import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
const getLookalikes = async(seedDomain)=> {
  try {
    console.log(`[Ocean.io] Searching lookalikes for: ${seedDomain}`);

    if (!process.env.OCEAN_API_TOKEN) {
      console.log('[Ocean.io] API token missing. Using fallback mock domains.');
      return ['stripe.com', 'vercel.com', 'clerk.com'];
    }

    const response = await axios.post(
      'https://api.ocean.io/v3/search/companies',
      {
        size: 8,
        companiesFilters: {
          lookalikeDomains: [seedDomain]
        },
        fields: ['domain']
      },
      {
        headers: {
          'x-api-token': process.env.OCEAN_API_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    // Safety checks for API response nesting formats
    const companies = response.data?.companies || response.data?.results || [];
    // Debug log the raw response (optional, can be removed later)
    console.log('Raw Ocean.io response:', JSON.stringify(response.data, null, 2));
    const domains = companies
      .map(item => {
        // Support both nested 'company' objects and flat structures
        if (item && typeof item === 'object') {
          if ('company' in item && item.company && typeof item.company === 'object') {
            return item.company.domain;
          }
          if ('domain' in item) {
            return item.domain;
          }
        }
        return undefined;
      })
      .filter(domain => typeof domain === 'string' && domain.trim() !== '');

    return domains;
  } catch (error) {
    console.error(`[Ocean.io] Error fetching lookalikes: ${error.message}`);
    throw error;
  }
}

export default getLookalikes;