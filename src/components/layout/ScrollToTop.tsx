import { useEffect, useState, useCallback } from "react";
import "./ScrollToTop.scss";

export const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const HIDE_DELAY = 800; // 0.8 sekundy
  const SCROLL_THRESHOLD = 200; // próg przewinięcia w pikselach

  const hideButton = useCallback(() => {
    const timeoutId = window.setTimeout(() => {
      setIsVisible(false);
    }, HIDE_DELAY);

    return timeoutId;
  }, []);

  const handleScroll = useCallback(() => {
    if (window.scrollY > SCROLL_THRESHOLD) {
      setIsVisible(true);
    }
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    let timeoutId: number;

    const scrollListener = () => {
      handleScroll();
      window.clearTimeout(timeoutId);
      timeoutId = hideButton();
    };

    window.addEventListener("scroll", scrollListener, { passive: true });

    return () => {
      window.removeEventListener("scroll", scrollListener);
      window.clearTimeout(timeoutId);
    };
  }, [handleScroll, hideButton]);

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
