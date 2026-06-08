import getLookalikes from "./services/ocean.service.js";
import searchDecisionMakers from "./services/prospeoSearch.service.js";
import { enrichPeople } from "./services/prospeoEnrich.service.js";

const runPipeline = async (seed_domain) => {
  // Stage 01: Ocean.io
  console.log("[1/3] Finding lookalike companies...");
  const domains = await getLookalikes(seed_domain);
  console.log(`Found domains: ${JSON.stringify(domains)}`);

  if (domains.length === 0) {
    console.log("No lookalike domains found. Pipeline stopping early.");
    return [];
  }

  // Stage 02: Prospeo
  console.log("[2/3] Finding decision makers...");
  //for now lets take top 5 , later we can either take only those results which has complete data.
  const topDomains = domains.slice(0, 5);
  const decisionMakers = await searchDecisionMakers(topDomains);
  console.log("\n--DECISION MAKERS--\n");
  decisionMakers.forEach((person) => {
    console.log(
      `Name:${person.fullName},\nTitle:${person.title},\nDomain: ${person.companyDomain},\nLinkedin: ${person.linkedinUrl},\nPersonId: ${person.personId}\n\n`,
    );
  });

  // Stage 03: Prospeo : contact details
  console.log("[3/3] Enriching verified emails...");

  // Deduplicate personId
  const uniqueDecisionMakers = [
    ...new Map(decisionMakers.map((p) => [p.personId, p])).values(),
  ];

  const enrichedPeople = await enrichPeople(uniqueDecisionMakers);

  console.log("\n--ENRICHED PEOPLE--\n");
  enrichedPeople.forEach((person) => {
    console.log(
      `Name:${person.fullName},\nTitle:${person.title},\nDomain: ${person.companyDomain},\nLinkedin: ${person.linkedinUrl},\nEmail: ${person.email},\nEmailStatus: ${person.emailStatus},\nCompanyName: ${person.companyName},\nPersonId: ${person.personId}\n\n`,
    );
  });

  // Stage 04: Brevo
  console.log("Stage 04: Sending outreach...");

  // return enrichedPeople;
};

export default runPipeline;
