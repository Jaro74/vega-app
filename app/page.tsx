import Header from "@/components/Header";
import Hero from "@/components/Hero";
import WhatToExplore from "@/components/WhatToExplore";
import HowItWorks from "@/components/HowItWorks";
import Positioning from "@/components/Positioning";
import FinalCta from "@/components/FinalCta";
import Footer from "@/components/Footer";
import NeutralLandingAnalytics from "@/components/experiment/NeutralLandingAnalytics";

export default function Home() {
  return (
    <>
      <NeutralLandingAnalytics />
      <Header />
      <main>
        <Hero />
        <WhatToExplore />
        <HowItWorks />
        <Positioning />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
