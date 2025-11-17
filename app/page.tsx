"use client";

import { useState } from "react";
import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";
import { HeroSection } from "@/components/landing/hero-section";
import { FeatureTabs } from "@/components/landing/feature-tabs";
import { IntegrationsStrip } from "@/components/landing/integrations-strip";
import { CTAFooter } from "@/components/landing/cta-footer";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [isGetStartedClicked, setIsGetStartedClicked] = useState(false);

  const handleGetStartedClick = () => {
    setIsGetStartedClicked(true);
    router.push("/signup");
  };

  return (
    <>
      <Header onGetStartedClick={handleGetStartedClick} />
      <main className="min-h-screen">
        <HeroSection />
        <FeatureTabs />
        <IntegrationsStrip />
        <CTAFooter onGetStartedClick={handleGetStartedClick} />
      </main>
      <Footer />
    </>
  );
}
