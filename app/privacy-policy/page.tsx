import type { Metadata } from "next";
import Footer from "@/components/footer";

export const metadata: Metadata = {
  title: "Privacy Policy | Velosta",
  description: "How Velosta collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <main className="mx-auto max-w-3xl px-4 py-16 md:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#D97757]">Legal</p>
          <h1 className="mt-2 text-3xl font-bold text-[#0B1F2A]">Privacy Policy</h1>
          <p className="mt-2 text-sm text-[#0B1F2A]/50">Last updated: April 28, 2026</p>
        </div>

        <div className="prose prose-sm max-w-none text-[#0B1F2A]/80 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[#0B1F2A] [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5">
          <p>
            Velosta (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is committed to protecting your personal
            information. This Privacy Policy explains how we collect, use, disclose, and safeguard your
            information when you visit our website and use our services.
          </p>

          <h2>1. Information We Collect</h2>
          <p>We may collect the following types of information:</p>
          <ul>
            <li>
              <strong>Account information:</strong> name, email address, and password when you register
              an account.
            </li>
            <li>
              <strong>Profile information:</strong> optional avatar and travel preferences you provide.
            </li>
            <li>
              <strong>Usage data:</strong> pages visited, features used, and interactions with the
              platform (collected automatically).
            </li>
            <li>
              <strong>Device information:</strong> browser type, IP address, and operating system for
              security and analytics.
            </li>
            <li>
              <strong>Third-party sign-in data:</strong> if you sign in with Google, we receive your
              name, email, and profile picture from Google.
            </li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <ul>
            <li>To create and manage your account.</li>
            <li>To provide, operate, and improve our services.</li>
            <li>To send transactional emails (sign-up confirmations, login codes).</li>
            <li>
              To send you weekly blog digests and marketing communications —{" "}
              <strong>only if you opted in</strong>. You may unsubscribe at any time.
            </li>
            <li>To detect and prevent fraud or abuse.</li>
            <li>To comply with applicable laws and regulations.</li>
          </ul>

          <h2>3. How We Share Your Information</h2>
          <p>
            We do not sell your personal information. We may share your data with trusted third-party
            service providers who assist us in operating our platform (hosting, email delivery,
            analytics) under strict confidentiality agreements. We may also disclose your information
            when required by law.
          </p>

          <h2>4. Email Communications</h2>
          <p>
            We send the following types of emails:
          </p>
          <ul>
            <li>
              <strong>Transactional:</strong> account creation confirmation, login OTP codes. These are
              required for account security and cannot be opted out of while your account is active.
            </li>
            <li>
              <strong>Marketing / Blog digest:</strong> weekly travel stories and content. You can opt
              in during sign-up or opt out at any time via the unsubscribe link in any marketing email.
            </li>
          </ul>

          <h2>5. Data Retention</h2>
          <p>
            We retain your personal data for as long as your account is active or as needed to provide
            you services. You may request deletion of your account and associated data by contacting us
            at{" "}
            <a href="mailto:support@velosta.com" className="text-[#D97757] no-underline hover:underline">
              support@velosta.com
            </a>
            .
          </p>

          <h2 id="cookies">6. Cookies &amp; Tracking</h2>
          <p>
            We use cookies and similar technologies to keep you signed in and to understand how the
            platform is used. You can disable cookies in your browser settings, though some features
            may not function correctly without them.
          </p>

          <h2>7. Security</h2>
          <p>
            We implement industry-standard security measures including encrypted data storage
            (AES-256), HTTPS-only transmission, and JWT-based authentication. No transmission method
            over the internet is 100% secure; we strive to use commercially acceptable means to
            protect your data.
          </p>

          <h2>8. Children&apos;s Privacy</h2>
          <p>
            Our services are not directed to individuals under 13 years of age. We do not knowingly
            collect personal information from children. If you become aware that a child has provided
            us with personal information, please contact us.
          </p>

          <h2>9. Your Rights</h2>
          <p>
            Depending on your location, you may have rights to access, correct, delete, or restrict
            processing of your personal data. To exercise these rights, contact us at{" "}
            <a href="mailto:support@velosta.com" className="text-[#D97757] no-underline hover:underline">
              support@velosta.com
            </a>
            .
          </p>

          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of significant
            changes by posting the new policy on this page with an updated date. Continued use of
            Velosta after changes constitutes your acceptance of the revised policy.
          </p>

          <h2>11. Contact Us</h2>
          <p>
            For questions about this Privacy Policy, please contact us at{" "}
            <a href="mailto:support@velosta.com" className="text-[#D97757] no-underline hover:underline">
              support@velosta.com
            </a>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
