import { useEffect, useState } from "react";
import "./Preloader.scss";

const Preloader = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`preloader ${!isLoading ? "preloader--hidden" : ""}`}>
      <div className="preloader__content">
        <div className="preloader__line preloader__line--1"></div>
        <div className="preloader__line preloader__line--2"></div>
        <div className="preloader__line preloader__line--3"></div>
        <div className="preloader__line preloader__line--4"></div>
        <div className="preloader__circle"></div>
      </div>
      <div className="preloader__brand">
        <img
          src="/images/logos/logo-domindev-white-transparentbg-724x724.svg"
          alt="DominDev Logo"
          className="preloader__brand-logo"
        />
        <span className="preloader__brand-name">DominDev</span>
      </div>
    </div>
  );
};

export default Preloader;
