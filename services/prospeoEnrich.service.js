import axios from "axios";

const enrichPeople = async (people) => {
  if (!process.env.PROSPEO_API_KEY) {
    throw new Error("PROSPEO_API_KEY environment variable is not defined");
  }

  if (!Array.isArray(people) || people.length === 0) {
    console.log("Matched: 0");
    console.log("Not matched: 0");
    console.log("Invalid: 0");
    return [];
  }

  const allMatched = [];
  let totalNotMatched = 0;
  let totalInvalid = 0;

  for (let i = 0; i < people.length; i += 1) {
    const chunk = people.slice(i, i + 1);

    console.log(`[${i + 1}/${people.length}] ${people[i].fullName}`);

    try {
      const response = await axios.post(
        "https://api.prospeo.io/bulk-enrich-person",
        {
          only_verified_email: true,
          data: chunk.map((person) => ({
            identifier: `prospect_${person.personId}`,
            person_id: person.personId,
          })),
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
        if (errorCode === "NO_MATCH") {
          totalNotMatched += 1;
          console.log(`[NO_MATCH] ${people[i].fullName || people[i].personId}`);
          await new Promise((resolve) => setTimeout(resolve, 1200));
          continue;
        }
        console.log("STATUS:", error.response?.status);
        if (errorCode === "INSUFFICIENT_CREDITS") {
          throw new Error(
            "Prospeo API Error: INSUFFICIENT_CREDITS - Insufficient credits remaining in your account.",
          );
        }
        if (errorCode === "INVALID_API_KEY") {
          throw new Error(
            "Prospeo API Error: INVALID_API_KEY - Invalid API key, check your X-KEY header.",
          );
        }
        if (
          errorCode === "RATE_LIMITED" ||
          errorCode === "Rate limit exceeded"
        ) {
          throw new Error(
            "Prospeo API Error: RATE_LIMITED - You hit the rate limit for your current plan.",
          );
        }
        if (errorCode === "INVALID_REQUEST") {
          throw new Error(
            "Prospeo API Error: INVALID_REQUEST - The request submitted is invalid.",
          );
        }
        throw new Error(`Prospeo API Error: ${errorCode}`);
      }

      const matched = data?.matched || [];
      const notMatched = data?.not_matched || [];
      const invalidDatapoints = data?.invalid_datapoints || [];

      totalNotMatched += notMatched.length;
      totalInvalid += invalidDatapoints.length;

      const mapped = matched
        .map((record) => {
          if (!record || !record.person) return null;
          return {
            personId: record.person.person_id,
            fullName: record.person.full_name,
            title: record.person.current_job_title,
            linkedinUrl: record.person.linkedin_url,
            email: record.person.email?.email || null,
            emailStatus: record.person.email?.status || null,
            companyName: record.company?.name || null,
            companyDomain: record.company?.domain || null,
          };
        })
        .filter((item) => item !== null && item.personId);

      allMatched.push(...mapped);
      await new Promise((resolve) => setTimeout(resolve, 1200));
    } catch (error) {
      const data = error.response?.data;
      const errorCode = data?.error_code;

      if (errorCode === "NO_MATCH") {
        totalNotMatched += 1;
        console.log(`[NO_MATCH] ${people[i].fullName || people[i].personId}`);
        await new Promise((resolve) => setTimeout(resolve, 1200));
        continue;
      }

      if (errorCode === "INSUFFICIENT_CREDITS") {
        throw new Error(
          "Prospeo API Error: INSUFFICIENT_CREDITS - Insufficient credits remaining in your account.",
        );
      }
      if (errorCode === "INVALID_API_KEY") {
        throw new Error(
          "Prospeo API Error: INVALID_API_KEY - Invalid API key, check your X-KEY header.",
        );
      }
      if (
        errorCode === "RATE_LIMITED" ||
        errorCode === "Rate limit exceeded" ||
        error.response?.status === 429
      ) {
        throw new Error(
          "Prospeo API Error: RATE_LIMITED - You hit the rate limit for your current plan.",
        );
      }
      if (errorCode === "INVALID_REQUEST") {
        throw new Error(
          "Prospeo API Error: INVALID_REQUEST - The request submitted is invalid.",
        );
      }

      throw new Error(`Prospeo API Error: ${errorCode || error.message}`);
    }
  }

  console.log(`Matched: ${allMatched.length}`);
  console.log(`Not matched: ${totalNotMatched}`);
  console.log(`Invalid: ${totalInvalid}`);

  return allMatched;
};

export default enrichPeople;
