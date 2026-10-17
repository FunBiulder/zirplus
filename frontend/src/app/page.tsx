import { Hero } from "@/components/home/Hero";
import { Formula } from "@/components/home/Formula";
import { Hours } from "@/components/home/Hours";
import { Routing } from "@/components/home/Routing";
import { Contrast } from "@/components/home/Contrast";
import { Chain } from "@/components/home/Chain";
import { Pledges } from "@/components/home/Pledges";
import { Faq } from "@/components/home/Faq";
import { Closing } from "@/components/home/Closing";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <main>
        <Hero />
        <Formula />
        <Hours />
        <Routing />
        <Contrast />
        <Chain />
        <Pledges />
        <Faq />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
