import getLookalikes from "./services/ocean.service.js";
import searchDecisionMakers from "./services/prospeoSearch.service.js";
import enrichPeople from "./services/prospeoEnrich.service.js";
import sendOutreachEmail from "./services/brevo.service.js";
import readline from "readline/promises";

const runPipeline = async (seed_domain) => {
  // Stage 01: Ocean.io
  console.log("[1/3] Finding lookalike companies...");
  const domains = await getLookalikes(seed_domain);
  console.log(`🟢Found domains: ${JSON.stringify(domains)}\n`);

  if (domains.length === 0) {
    console.log("No lookalike domains found. Pipeline stopping early.");
    return [];
  }

  // Stage 02: Prospeo
  console.log("[2/3] Finding decision makers...");
  //for now lets take top 5 , later we can either take only those results which has complete data.
  const DOMAIN_LIMIT = 5;
  const topDomains = domains.slice(0, DOMAIN_LIMIT);
  const decisionMakers = await searchDecisionMakers(topDomains);

  if (!decisionMakers.length) {
    console.log("No decision makers found.");
    return [];
  }

  console.log("\n--DECISION MAKERS--\n");
  console.log(`Found ${decisionMakers.length} decision makers`);

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
  console.log(`Enriching ${uniqueDecisionMakers.length} prospects`);
  const inlimitBatch = uniqueDecisionMakers.slice(0, 5);

  console.log(`Using ${inlimitBatch.length} people for enrichment`);
  const enrichedPeople = await enrichPeople(inlimitBatch);

  console.log("\n--ENRICHED PEOPLE--\n");
  console.log(`Found ${enrichedPeople.length} verified emails`);

  enrichedPeople.forEach((person) => {
    console.log(
      `Name:${person.fullName},\nTitle:${person.title},\nDomain: ${person.companyDomain},\nLinkedin: ${person.linkedinUrl},\nEmail: ${person.email},\nEmailStatus: ${person.emailStatus},\nCompanyName: ${person.companyName},\nPersonId: ${person.personId}\n\n`,
    );
  });

  if (!enrichedPeople.length) {
    console.log("No verified emails found.");
    return [];
  }

  // Stage 04: Brevo
  console.log("Final Stage: Sending outreach...");

  //List of people to whom email will be sent
  console.log("\nRecipients:");
  enrichedPeople.forEach((person, index) => {
    console.log(`${index + 1}. ${person.fullName} <${person.email}>`);
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\n--- EMAIL PREVIEW ---\n");

  const sample = enrichedPeople[0];

  console.log(`
    To: ${sample.fullName} <${sample.email}>
    Subject: Improving outbound prospecting at ${sample.companyName}

    Hi ${sample.fullName.split(" ")[0]} || ${sample.fullName};

    I noticed you're leading customer experience at ${sample.companyName}.

    We recently built an outbound prospecting workflow that helps teams identify and reach highly relevant B2B prospects automatically.

    Would you be open to a quick conversation this week?

    Best regards,
    Prathamesh
  `);

  const answer = await rl.question(
    `Send ${enrichedPeople.length} emails? (y/n): `,
  );

  rl.close();

  if (answer.trim().toLowerCase() !== "y") {
    console.log("Email delivery aborted.");
    return enrichedPeople;
  }
  //   POST /v3/smtp/email
  //  GET /v3/smtp/blockedContacts	3,600,000 RPH	1,000 RPS
  for (const person of enrichedPeople) {
    try {
      const response = await sendOutreachEmail(person);
      console.log(`🟢 Email queued for ${person.fullName}`);
    } catch (error) {
      console.error(
        `❌ Failed for ${person.fullName}:`,
        error.response?.data || error.message,
      );
    }
  }
  return enrichedPeople;
};

export default runPipeline;
