import Link from "next/link";
import { OctopusLogo } from "@/components/octopus-logo";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 h-screen mx-auto gap-4 md:gap-10 items-center px-4 max-w-7xl">
      {/* Logo Section */}
      <div className="text-center flex flex-col items-center">
        <OctopusLogo />
      </div>

      {/* Content Section */}
      <div className="space-y-10 text-left flex flex-col items-center pl-4 pr-12">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold font-playfair">
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

        {/* Action Buttons */}
        <div className="flex gap-4 w-full justify-center xl:justify-start">
          <Button asChild size="lg" className="font-semibold">
            <Link href="/chat">Ask Octoo</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="font-semibold">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
