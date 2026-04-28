import Image from "next/image";
// import { NewsletterForm } from "./newsletter-form";

export default function Footer() {
  return (
    <footer className="mt-16 w-full bg-[var(--color-cream)]">
      {/* Top prompt row */}
      <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
      </div>

      <hr className="border-black/10" />

      {/* Columns */}
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* Contact */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-[var(--color-navy)]">
              Contact
            </h4>
            <p className="text-sm text-[var(--color-navy)]/70">
              HITEC City, Hyderabad, Telangana 500081, India
            </p>
            <p className="mt-2 text-sm text-[var(--color-navy)]/70">
              hello@velosta.com
            </p>
          </div>

          {/* Company */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-[var(--color-navy)]">
              Company
            </h4>
            <ul className="space-y-2 text-sm text-[var(--color-navy)]/70">
              <li>
                <a
                  href="/velosta-ai"
                  className="hover:text-[var(--color-navy)]"
                >
                  Velosta-AI
                </a>
              </li>
              <li>
                <a
                  href="/how-not-travel"
                  className="hover:text-[var(--color-navy)]"
                >
                  How Not To Travel
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-[var(--color-navy)]">
              Legal
            </h4>
            <ul className="space-y-2 text-sm text-[var(--color-navy)]/70">
              <li>
                <a
                  href="/privacy-policy"
                  className="hover:text-[var(--color-navy)]"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="/terms-of-service"
                  className="hover:text-[var(--color-navy)]"
                >
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          {/* <div>
            <h4 className="mb-3 text-sm font-semibold text-[var(--color-navy)]">
              Support
            </h4>
            <ul className="space-y-2 text-sm text-[var(--color-navy)]/70">
              <li>
                <a href="#" className="hover:text-[var(--color-navy)]">
                  Get in Touch
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[var(--color-navy)]">
                  Help center
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[var(--color-navy)]">
                  Live chat
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[var(--color-navy)]">
                  How it works
                </a>
              </li>
            </ul>
          </div> */}

          {/* Newsletter + Apps */}
          <div>
            {/* <h4 className="mb-3 text-sm font-semibold text-[var(--color-navy)]">
              Newsletter
            </h4>
            <p className="mb-3 text-sm text-[var(--color-navy)]/70">
              Subscribe to the free newsletter and stay up to date
            </p> */}
            {/* <NewsletterForm /> */}

            {/* <div className="mt-6">
              <h4 className="mb-3 text-sm font-semibold text-[var(--color-navy)]">
                Mobile Apps
              </h4>
              <ul className="space-y-2 text-sm text-[var(--color-navy)]/70">
                <li>
                  <a href="#" className="hover:text-[var(--color-navy)]">
                    iOS App
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[var(--color-navy)]">
                    Android App
                  </a>
                </li>
              </ul>
            </div> */}
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-10 flex items-center justify-between border-t border-black/10 pt-6">
          <p className="text-xs text-[var(--color-navy)]/60">
            © Copyright Velosta 2025
          </p>
          <div>
            <div>
              <p className="text-xs text-[var(--color-navy)]/60 mb-2">
                Follow Us
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Image
                src={"/icons/instagram.png"}
                alt="Instagram"
                width={40}
                height={16}
              />
              <Image
                src={"/icons/twitter.png"}
                alt="Twitter"
                width={40}
                height={16}
              />
              {/* <Image
                src={"/icons/youtube.png"}
                alt="Youtube"
                width={40}
                height={16}
              />
              <Image
                src={"/icons/linkedin.png"}
                alt="Linkedin"
                width={40}
                height={16}
              /> */}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
