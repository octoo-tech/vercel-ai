"use client";

import Link from "next/link";
import { useState } from "react";
import { OctopusLogo } from "@/components/octopus-logo";
import { Button } from "@/components/ui/button";
import { ContactForm } from "@/components/contact-form";

export default function LandingPage() {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex-none z-10">
        <div className="flex items-center justify-between gap-4 bg-surface-100 p-4">
          <div className="flex items-center">
            <img
              src="/octo-o.png"
              alt="OCTOO"
              className="h-8 w-auto uppercase"
            />
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setContactOpen(true)}
            >
              Contact
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/chat">Ask Octoo</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Contact Form Dialog */}
      <ContactForm open={contactOpen} onOpenChange={setContactOpen} />

      {/* Main Content */}
      <main className="flex-auto overflow-x-hidden">
        <div className="grid grid-cols-1 xl:grid-cols-2 h-full mx-auto gap-4 md:gap-10 items-center px-4">
          {/* Logo Section */}
          <div className="text-center flex flex-col items-center">
            <OctopusLogo />
          </div>

          {/* Content Section */}
          <div className="space-y-10 text-left flex flex-col items-center pl-4 pr-12">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-normal" style={{ fontFamily: 'var(--font-playfair)' }}>
                What is Octoo?
              </h1>
              <p className="text-base md:text-lg">
                Octoo is a revolutionary, specialized search engine and comprehensive suite of
                communication tools exclusively for interior design professionals to source and
                purchase products from to the trade showrooms and manufacturers.
              </p>
              <p className="text-base md:text-lg">
                Streamlined searching across multiple showrooms and manufacturers enables design
                professionals to abandon the current tedious search for products: showroom by showroom
                or manufacturer by manufacturer. Octoo displays search results in one consolidated
                website and includes products only from to the trade showrooms and manufacturers
                including custom furnishings, case goods, and lighting.
              </p>
              <p className="text-base md:text-lg">
                Integrated tools provide seamless connectivity between showrooms and design
                professionals, enable designers to retrieve up to date pricing and availability
                information, and manage their projects all in one location.
              </p>
              <p className="text-base md:text-lg">
                Octoo is an all in one solution that increases sales, productivity and information
                management.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
