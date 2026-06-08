import axios from "axios";

const sendOutreachEmail = async (prospect) => {
  return axios.post(
    "https://api.brevo.com/v3/smtp/email",
    {
      sender: {
        name: process.env.BREVO_SENDER_NAME,
        email: process.env.BREVO_SENDER_EMAIL,
      },

      to: [
        {
          email: prospect.email,
          name: prospect.fullName,
        },
      ],

      subject: `Improving outbound prospecting at ${prospect.companyName || prospect.companyDomain}`,

      htmlContent: `Hi ${prospect.fullName},<p>
I noticed you're leading customer experience at ${prospect.companyName || prospect.companyDomain}.
</p>

<p>
We recently built an outbound prospecting workflow that helps teams identify and reach highly relevant B2B prospects automatically.
</p>

<p>
Would you be open to a quick conversation this week?
</p>

<p>
Best regards,<br/>
${process.env.BREVO_SENDER_NAME}
</p>`,
    },

    {
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
    },
  );
};

export default sendOutreachEmail;
