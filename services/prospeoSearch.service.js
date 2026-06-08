import axios from "axios";
// import dotenv from "dotenv";
// dotenv.config();

const searchDecisionMakers = async (domains) => {
  if (!process.env.PROSPEO_API_KEY) {
    throw new Error("PROSPEO_API_KEY environment variable is not defined");
  }

  try {
    const response = await axios.post(
      "https://api.prospeo.io/search-person",
      {
        page: 1,
        filters: {
          company: {
            websites: {
              include: domains,
            },
          },
          person_seniority: {
            include: ["Founder/Owner", "C-Suite", "Vice President", "Director"],
          },
        },
      },
      {
        headers: {
          "X-KEY": process.env.PROSPEO_API_KEY,
          "Content-Type": "application/json",
        },
      },
    );

    const data = response.data;

    if (data?.error) {
      const errorCode = data.error_code;
      if (errorCode === "NO_RESULTS") {
        console.log("[Prospeo] Found 0 decision makers");
        return [];
      }
      throw new Error(
        `Prospeo API Error: ${errorCode} - ${data.filter_error || ""}`,
      );
    }

    const results = data?.results || [];
    const mapped = results
      .map((result) => {
        if (!result?.person) return null;
        return {
          personId: result.person.person_id,
          fullName: result.person.full_name,
          title: result.person.current_job_title,
          linkedinUrl: result.person.linkedin_url,
          companyDomain: result.company?.domain,
        };
      })
      .filter((item) => item !== null && item.personId);

    console.log(`[Prospeo] Found ${mapped.length} decision makers`);
    const companyMap = {};

    for (const person of mapped) {
      const company = person.companyDomain;

      if (!companyMap[company]) companyMap[company] = [];

      companyMap[company].push(person);
    }

    const diversified = Object.values(companyMap).flatMap((companyPeople) =>
      companyPeople.slice(0, 5),
    );

    return diversified;
  } catch (error) {
    const data = error.response?.data;
    const errorCode = data?.error_code;

    if (errorCode === "NO_RESULTS") {
      console.log("[Prospeo] Found 0 decision makers");
      return [];
    }

    if (errorCode === "INVALID_API_KEY") {
      throw new Error(
        "Prospeo API Error: INVALID_API_KEY - Invalid API key, check your X-KEY header.",
      );
    }

    if (errorCode === "RATE_LIMITED") {
      throw new Error(
        "Prospeo API Error: RATE_LIMITED - You hit the rate limit for your current plan.",
      );
    }

    if (errorCode === "INVALID_FILTERS") {
      throw new Error(
        `Prospeo API Error: INVALID_FILTERS - ${data.filter_error || ""}`,
      );
    }

    throw new Error(`Prospeo API Error: ${errorCode || error.message}`);
  }
};

export default searchDecisionMakers;
