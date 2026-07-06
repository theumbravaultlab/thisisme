import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service · thisisme",
  description: "The terms for using thisisme.",
};

const CONTACT = "darrenchurn@gmail.com";

const sections: LegalSection[] = [
  {
    heading: "1. Agreement",
    paras: [
      `By using thisisme ("the Service"), you agree to these Terms of Service and to our Privacy Policy. If you don't agree, please don't use the Service.`,
    ],
  },
  {
    heading: "2. Eligibility",
    paras: [
      "You must be at least 13 years old, or the minimum age required in your country (for example, 16 in parts of the EU), to use the Service. By using it, you confirm that you meet this requirement.",
    ],
  },
  {
    heading: "3. Your account",
    paras: [
      "You're responsible for activity under your account and for keeping your sign-in method secure. Sign-in is handled through email links or Google. You can delete your account at any time from the Account menu.",
    ],
  },
  {
    heading: "4. Your content",
    paras: [
      "You keep ownership of the profile information and photos you add. You grant us a limited licence to store, process, and display that content solely to operate the Service — including generating avatars from photos you upload and, if you enable sharing, publishing the fields you mark visible at your public link.",
      "You represent that you have the rights to any photo you upload, and that your content is not illegal, infringing, deceptive, or harmful.",
    ],
  },
  {
    heading: "5. Acceptable use",
    paras: ["You agree not to:"],
    list: [
      "impersonate another person or misrepresent your identity in a harmful or deceptive way;",
      "upload content that is unlawful, hateful, harassing, sexually exploitative, infringing, or that violates others' rights;",
      "upload photos of other people without their permission;",
      "attempt to break, overload, scrape, or circumvent the Service, its rate limits, or its usage caps;",
      "abuse the avatar generator or use the Service to generate misleading or deceptive imagery.",
    ],
  },
  {
    heading: "6. AI-generated avatars",
    paras: [
      "Avatars are produced by third-party AI models and are provided \"as is\". Results vary and may not be accurate or as expected. You are responsible for how you use generated images and for having the rights to the source photos you provide.",
    ],
  },
  {
    heading: "7. Premium and payments",
    paras: [
      "Premium is a one-time purchase (currently $9) that unlocks the features described in the app. Payments are sold and processed by Lemon Squeezy as merchant of record; their terms and refund handling apply to the transaction, and taxes may be added at checkout.",
      "If you'd like a refund, contact us or Lemon Squeezy within a reasonable time and we'll consider it in good faith. We may change Premium's price or features going forward; a purchase you've already made continues to include what was described at the time of purchase.",
    ],
  },
  {
    heading: "8. Availability",
    paras: [
      "The Service is provided on an \"as is\" and \"as available\" basis, without warranties of any kind, whether express or implied. We don't guarantee that it will be uninterrupted, error-free, or that generated results will meet your expectations.",
    ],
  },
  {
    heading: "9. Limitation of liability",
    paras: [
      "To the maximum extent permitted by law, thisisme and its operators will not be liable for any indirect, incidental, special, or consequential damages, or for loss of data or profiles. Our total liability for any claim relating to the Service is limited to the amount you paid us in the twelve months before the claim (or, if you paid nothing, to $9).",
    ],
  },
  {
    heading: "10. Termination",
    paras: [
      "You can stop using the Service and delete your account at any time. We may suspend or terminate access if you violate these Terms or use the Service in a way that risks harm to others or to the Service.",
    ],
  },
  {
    heading: "11. Changes to these terms",
    paras: [
      "We may update these Terms from time to time. When we do, we'll revise the \"last updated\" date above. Your continued use of the Service after a change means you accept the updated Terms.",
    ],
  },
  {
    heading: "12. Governing law",
    paras: [
      "These Terms are governed by the laws of the operator's principal place of business [set your state/country], without regard to conflict-of-laws rules. Nothing here removes any mandatory consumer-protection rights you have where you live.",
    ],
  },
  {
    heading: "13. Contact",
    paras: [`Questions about these Terms? Email ${CONTACT}.`],
  },
];

export default function TermsPage() {
  return <LegalPage title="Terms of Service" updated="July 6, 2026" sections={sections} />;
}
