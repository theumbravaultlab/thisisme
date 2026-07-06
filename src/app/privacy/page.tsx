import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy · thisisme",
  description: "How thisisme collects, uses, and protects your data.",
};

const CONTACT = "darrenchurn@gmail.com";

const sections: LegalSection[] = [
  {
    heading: "Who we are",
    paras: [
      `thisisme ("we", "us") is a web app that lets you build a personal profile and an AI-generated avatar, and optionally share it at a public link. This policy explains what we collect, why, and the choices you have. Questions? Email ${CONTACT}.`,
    ],
  },
  {
    heading: "Information we collect",
    list: [
      "Account details — your email address, provided when you sign in by email link or with Google.",
      "Profile content you enter — such as your name, birthday, location, bio-style fields, favorites, and social handles. You choose what to add; you can leave any field blank.",
      "Photos you upload to generate an avatar, and the avatars generated from them.",
      "Purchase information — if you buy Premium, our payment provider processes your payment. We receive an order confirmation and reference id, never your full card details.",
      "Usage analytics — only if you opt in. These are privacy-friendly and cookieless (no cross-site tracking, no advertising profiles).",
      "Technical data — your IP address and basic request information are processed transiently by our hosting and backend providers to deliver the service and prevent abuse (for example, rate-limiting avatar generation).",
    ],
  },
  {
    heading: "How we use your information",
    list: [
      "To provide the app: save your profile, sync it across your devices when signed in, and generate and store your avatars.",
      "To publish the parts of your profile you choose to share, at your public link.",
      "To process purchases and grant Premium features.",
      "To keep the service secure and within cost limits (abuse prevention and rate-limiting).",
      "If you opt in, to understand aggregate usage so we can improve the app.",
    ],
  },
  {
    heading: "Browser storage (instead of cookies)",
    paras: [
      "We do not use advertising or cross-site tracking cookies. To make the app work, we store your profile, your preferences, your sign-in session, and your privacy choice in your browser's local storage. This is essential and stays on your device. Clearing your browser storage signs you out and removes locally-cached data.",
    ],
  },
  {
    heading: "Analytics and your choices",
    paras: [
      "Product analytics are optional and off until you accept them in the consent banner. They are cookieless and do not build an advertising profile of you. You can change your choice at any time using the \"Privacy choices\" link in the footer — choosing \"Essential only\" stops analytics immediately.",
    ],
  },
  {
    heading: "Photos and AI avatars",
    paras: [
      "When you generate an avatar, the photo you provide is sent to our AI image provider to remove the background and apply the style you pick, then the result is returned to you. We do not use your photo to identify you or to build a biometric or facial-recognition profile, and we do not sell it. Generated avatars are saved to your profile (and cached in your browser). Only upload photos you have the right to use.",
    ],
  },
  {
    heading: "Public profiles",
    paras: [
      "Sharing is off by default. If you turn it on, the fields you mark visible are published at a public URL and can be viewed — and indexed by search engines — by anyone with the link. Do not share anything you want to keep private. You can turn sharing off, or delete your account, to remove the public page.",
    ],
  },
  {
    heading: "Service providers",
    paras: [
      "We rely on a small number of trusted providers who process data on our behalf. Their own privacy policies govern their handling of your data:",
    ],
    list: [
      <>
        <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Supabase</a>
        {" — account sign-in, database, and hosting of your profile data."}
      </>,
      <>
        <a href="https://fal.ai/privacy" target="_blank" rel="noopener noreferrer">fal.ai</a>
        {" — AI processing of the photos you submit for avatar generation."}
      </>,
      <>
        <a href="https://www.lemonsqueezy.com/privacy" target="_blank" rel="noopener noreferrer">Lemon Squeezy</a>
        {" — payment processing (merchant of record) for Premium."}
      </>,
      <>
        <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Vercel</a>
        {" — hosting, content delivery, and optional cookieless analytics."}
      </>,
      <>
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google</a>
        {" — only if you choose \"Continue with Google\" to sign in."}
      </>,
    ],
  },
  {
    heading: "Your rights",
    paras: [
      "Depending on where you live (including under the EU/UK GDPR and the California CCPA/CPRA), you have rights over your personal data. thisisme supports these directly:",
    ],
    list: [
      "Access and portability — export everything you've entered as a JSON file from the Account menu (\"Export my data\").",
      "Deletion / erasure — permanently delete your account and all associated data from the Account menu (\"Delete account\"). This cannot be undone.",
      "Opt out of analytics — choose \"Essential only\" in the banner or via \"Privacy choices\".",
      "We do not sell your personal information.",
      `To exercise any other right or ask a question, email ${CONTACT}.`,
    ],
  },
  {
    heading: "Data retention",
    paras: [
      "We keep your profile for as long as your account exists. When you delete your account, your data is removed from our live database promptly; residual copies in routine backups age out on a rolling basis. Your payment provider may retain transaction records as required by law.",
    ],
  },
  {
    heading: "Children",
    paras: [
      "thisisme is not directed to children under 13, or under the minimum age required in your country (for example, 16 in parts of the EU). Please do not use the app if you are under that age.",
    ],
  },
  {
    heading: "International transfers",
    paras: [
      "Our providers may store and process data in the United States and other countries. Where required, they rely on appropriate safeguards for such transfers.",
    ],
  },
  {
    heading: "Security",
    paras: [
      "We use reputable providers and access controls, including database row-level security so that users can only read their own private data. No method of storage or transmission is completely secure, and we cannot guarantee absolute security.",
    ],
  },
  {
    heading: "Changes to this policy",
    paras: [
      "We may update this policy from time to time. When we do, we'll revise the \"last updated\" date above. Significant changes may be highlighted in the app.",
    ],
  },
  {
    heading: "Contact",
    paras: [`Questions about this policy or your data? Email ${CONTACT}.`],
  },
];

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" updated="July 6, 2026" sections={sections} />;
}
