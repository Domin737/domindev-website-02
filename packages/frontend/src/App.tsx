import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import Header from "./components/layout/Header";
import ScrollProgress from "./components/layout/ScrollProgress";
import Preloader from "./components/layout/Preloader";
import Footer from "./components/layout/Footer";
import { ScrollToTop } from "./components/layout/ScrollToTop";
import AdminPanel from "./components/layout/AdminPanel";
import FloatingChat from "./components/layout/FloatingChat";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TemperatureProvider } from "./contexts/TemperatureContext";
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

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <ThemeProvider theme={theme} setTheme={setTheme}>
      <TemperatureProvider>
        <ScrollProgress />
        {isLoading && <Preloader />}
        <Header />
        <main>
          <Suspense
            fallback={<div className="section-loader">Ładowanie...</div>}
          >
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
        <FloatingChat />
        <ScrollToTop />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 5000,
            style: {
              background: "var(--color-background-darker)",
              color: "var(--color-text)",
              boxShadow: "var(--neon-glow-primary)",
            },
          }}
        />
      </TemperatureProvider>
    </ThemeProvider>
  );
}

export default App;
