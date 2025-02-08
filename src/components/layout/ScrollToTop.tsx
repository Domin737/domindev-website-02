import { useEffect, useState, useRef } from "react";
import "./ScrollToTop.scss";

export const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>();

  const handleScroll = () => {
    const currentScrollY = window.scrollY;

    // Pokazuj przycisk tylko podczas przewijania
    if (Math.abs(currentScrollY - lastScrollY.current) > 50) {
      setIsVisible(true);
      lastScrollY.current = currentScrollY;

      // Resetuj timer przy każdym przewinięciu
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      // Ukryj przycisk po 1.5 sekundy bez przewijania
      scrollTimeout.current = setTimeout(() => {
        setIsVisible(false);
      }, 1500);
    }

    // Ukryj przycisk gdy jesteśmy na górze strony
    if (currentScrollY < 100) {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  return (
    <>
      {isVisible && (
        <button
          className="scroll-to-top"
          onClick={scrollToTop}
          aria-label="Przewiń do góry"
        >
          ↑
        </button>
      )}
    </>
  );
};
