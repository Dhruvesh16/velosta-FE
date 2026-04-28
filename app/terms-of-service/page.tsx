import type { Metadata } from "next";
import Footer from "@/components/footer";

export const metadata: Metadata = {
  title: "Terms of Service | Velosta",
  description: "The terms and conditions governing your use of the Velosta platform.",
};

export default function TermsOfServicePage() {
  return (
    <>
      <main className="mx-auto max-w-3xl px-4 py-16 md:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#D97757]">Legal</p>
          <h1 className="mt-2 text-3xl font-bold text-[#0B1F2A]">Terms of Service</h1>
          <p className="mt-2 text-sm text-[#0B1F2A]/50">Last updated: April 28, 2026</p>
        </div>

        <div className="prose prose-sm max-w-none text-[#0B1F2A]/80 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[#0B1F2A] [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5">
          <p>
            Welcome to Velosta. By accessing or using our website, mobile application, or any related
            services (collectively, the &ldquo;Services&rdquo;), you agree to be bound by these Terms of
            Service (&ldquo;Terms&rdquo;). Please read them carefully.
          </p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By creating an account or using the Services, you confirm that you are at least 13 years
            old, have read and understood these Terms, and agree to be bound by them. If you do not
            agree, do not use the Services.
          </p>

          <h2>2. Description of Services</h2>
          <p>
            Velosta provides a travel-centric platform where users can explore curated travel guides,
            plan trips with AI assistance, read and publish travel stories, track expenses, and
            discover community-generated content about travel experiences.
          </p>

          <h2>3. Account Registration</h2>
          <ul>
            <li>You must provide accurate, current, and complete information when creating your account.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>
              You are responsible for all activity that occurs under your account. Notify us immediately
              at{" "}
              <a href="mailto:hello@velosta.com" className="text-[#D97757] no-underline hover:underline">
                hello@velosta.com
              </a>{" "}
              if you suspect unauthorized access.
            </li>
            <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
          </ul>

          <h2>4. User Content</h2>
          <p>
            You retain ownership of content you publish on Velosta (stories, blog posts, trip notes).
            By posting content, you grant Velosta a non-exclusive, worldwide, royalty-free license to
            display, reproduce, and distribute your content solely for the purpose of operating and
            improving the Services.
          </p>
          <p>You agree not to post content that:</p>
          <ul>
            <li>Is unlawful, defamatory, harassing, or threatening.</li>
            <li>Infringes any third-party intellectual property rights.</li>
            <li>Contains malware, spam, or deceptive material.</li>
            <li>Violates the privacy of others.</li>
          </ul>
          <p>
            We reserve the right to remove any content that violates these guidelines without prior
            notice.
          </p>

          <h2>5. Intellectual Property</h2>
          <p>
            All Velosta brand assets, software, design, and original content are owned by Velosta or
            its licensors and are protected by applicable intellectual property laws. You may not copy,
            modify, distribute, or create derivative works without our express written consent.
          </p>

          <h2>6. Prohibited Activities</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Services for any unlawful purpose.</li>
            <li>Attempt to gain unauthorized access to any part of the Services.</li>
            <li>Reverse-engineer, decompile, or disassemble any part of the platform.</li>
            <li>Scrape, crawl, or use automated tools to extract data without permission.</li>
            <li>Impersonate another person or entity.</li>
          </ul>

          <h2>7. Third-Party Services</h2>
          <p>
            Velosta integrates with third-party services (Google Maps, AI providers, etc.). Your use
            of these services is subject to the respective third-party terms. We are not responsible
            for the content or practices of third-party services.
          </p>

          <h2>8. Disclaimer of Warranties</h2>
          <p>
            The Services are provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind,
            either express or implied. We do not warrant that the Services will be uninterrupted,
            error-free, or free of viruses or other harmful components. Travel information provided on
            Velosta is for reference only; always verify with official sources before travelling.
          </p>

          <h2>9. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, Velosta and its affiliates, directors, and
            employees shall not be liable for any indirect, incidental, special, consequential, or
            punitive damages arising from your use of or inability to use the Services, even if advised
            of the possibility of such damages.
          </p>

          <h2>10. Termination</h2>
          <p>
            You may delete your account at any time by contacting us. We reserve the right to suspend
            or terminate your account and access to the Services at our sole discretion, with or
            without notice, for conduct that we believe violates these Terms or is harmful to other
            users, us, or third parties.
          </p>

          <h2>11. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. We will notify you of material changes by
            posting the revised Terms on this page. Your continued use of the Services after the
            effective date constitutes acceptance of the revised Terms.
          </p>

          <h2>12. Governing Law</h2>
          <p>
            These Terms are governed by the laws of India, without regard to conflict of law
            principles. Any disputes shall be resolved in the courts located in Hyderabad, Telangana,
            India.
          </p>

          <h2>13. Contact Us</h2>
          <p>
            If you have questions about these Terms, please contact us at{" "}
            <a href="mailto:hello@velosta.com" className="text-[#D97757] no-underline hover:underline">
              hello@velosta.com
            </a>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
