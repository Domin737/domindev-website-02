import { useEffect } from "react";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import Hero from "./components/sections/Hero";
import About from "./components/sections/About";
import Services from "./components/sections/Services";
import Portfolio from "./components/sections/Portfolio";
import FAQ from "./components/sections/FAQ";
import Contact from "./components/sections/Contact";
import "./styles/global.scss";

function App() {
  useEffect(() => {
    // Dodaj klasę do body dla globalnych stylów
    document.body.classList.add("app");
    return () => {
      document.body.classList.remove("app");
    };
  }, []);

  return (
    <>
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
    </>
  );
}

export default App;
