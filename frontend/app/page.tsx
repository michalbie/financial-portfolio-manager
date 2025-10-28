import Hero from './_components/Hero';
import Features from './_components/Features';
import CTASection from './_components/CTASection';
import Footer from './_components/Footer';

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Features />
      <section style={{ backgroundColor: '#f8f9fa' }}>
        <CTASection />
      </section>
      <Footer />
    </>
  );
}
