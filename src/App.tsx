import { lazy, Suspense, useEffect, useState } from "react";
import Header from "./components/layout/Header";
import ScrollProgress from "./components/layout/ScrollProgress";
import Preloader from "./components/layout/Preloader";
import Footer from "./components/layout/Footer";
import { ScrollToTop } from "./components/layout/ScrollToTop";
import AdminPanel from "./components/layout/AdminPanel";
import { ThemeProvider } from "./contexts/ThemeContext";
import "./styles/global.scss";

// Lazy load sekcje
const Hero = lazy(() => import("./components/sections/Hero"));
const About = lazy(() => import("./components/sections/About"));
const Services = lazy(() => import("./components/sections/Services"));
const Portfolio = lazy(() => import("./components/sections/Portfolio"));
const FAQ = lazy(() => import("./components/sections/FAQ"));
const Contact = lazy(() => import("./components/sections/Contact"));

function App() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
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
    <ThemeProvider theme={theme} setTheme={setTheme}>
      <ScrollProgress />
      {isLoading && <Preloader />}
      <Header />
      <main>
        <Suspense fallback={<div className="section-loader">Ładowanie...</div>}>
          <Hero />
          <About />
          <Services />
          <Portfolio />
          <FAQ />
          <Contact />
        </Suspense>
      </main>
      <Footer />
      <AdminPanel />
      <ScrollToTop />
    </ThemeProvider>
  );
}

export default App;
