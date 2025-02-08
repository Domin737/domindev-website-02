import { useEffect, useState } from "react";
import Header from "./components/layout/Header";
import Preloader from "./components/layout/Preloader";
import Footer from "./components/layout/Footer";
import { ScrollToTop } from "./components/layout/ScrollToTop";
import AdminPanel from "./components/layout/AdminPanel";
import Hero from "./components/sections/Hero";
import About from "./components/sections/About";
import Services from "./components/sections/Services";
import Portfolio from "./components/sections/Portfolio";
import FAQ from "./components/sections/FAQ";
import Contact from "./components/sections/Contact";
import "./styles/global.scss";

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Dodaj klasę do body dla globalnych stylów
    document.body.classList.add("app");

    // Symulacja ładowania
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    return () => {
      document.body.classList.remove("app");
      clearTimeout(timer);
    };
  }, []);

  return (
    <>
      <Preloader />
      <Header />
      <main>
        <Hero />
        <About />
        <Services />
        <Portfolio />
        <FAQ />
        <Contact />
      </main>
      <Footer />
      <AdminPanel />
      <ScrollToTop />
    </>
  );
}

export default App;
