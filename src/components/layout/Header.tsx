import { useState, useEffect, useContext, memo } from "react";
import { ThemeContext } from "../../contexts/ThemeContext";
import { Link } from "react-scroll";
import { motion, useScroll } from "framer-motion";
import { FaGithub, FaLinkedin, FaTwitter } from "react-icons/fa";
import "./Header.scss";

const MENU_ITEMS = [
  { name: "Home", to: "hero" },
  { name: "O mnie", to: "about" },
  { name: "Usługi", to: "services" },
  { name: "Portfolio", to: "portfolio" },
  { name: "FAQ", to: "faq" },
  { name: "Kontakt", to: "contact" },
] as const;

const SocialLinks = memo(() => (
  <div className="header__social">
    <a href="https://github.com" target="_blank" rel="noopener noreferrer">
      <FaGithub />
    </a>
    <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
      <FaLinkedin />
    </a>
    <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
      <FaTwitter />
    </a>
  </div>
));

SocialLinks.displayName = "SocialLinks";

const MenuItems = memo(({ onItemClick }: { onItemClick: () => void }) => (
  <ul className="header__menu">
    {MENU_ITEMS.map((item) => (
      <li key={item.to} className="header__menu-item">
        <Link
          to={item.to}
          smooth={true}
          duration={500}
          offset={-100}
          onClick={onItemClick}
        >
          {item.name}
        </Link>
      </li>
    ))}
  </ul>
));

MenuItems.displayName = "MenuItems";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  useScroll(); // zachowujemy hook dla przyszłego użycia
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const updateScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", updateScroll);
    return () => window.removeEventListener("scroll", updateScroll);
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <motion.header className={`header ${isScrolled ? "is-scrolled" : ""}`}>
      <div className="container header__grid">
        <Link to="hero" smooth={true} duration={500} className="header__logo">
          <img
            src={
              useContext(ThemeContext).theme === "dark"
                ? "/images/logos/logo-domindev-white-transparentbg-362x362.svg"
                : "/images/logos/logo-domindev-black-transparentbg-362x362.svg"
            }
            alt="DominDev Logo"
            className="header__logo-img"
          />
          <span>DominDev</span>
        </Link>

        <nav className={`header__nav ${isOpen ? "is-open" : ""}`}>
          <MenuItems onItemClick={() => setIsOpen(false)} />
          <SocialLinks />
        </nav>

        <div className="header__cta">
          <a href="#contact" className="btn btn-primary">
            Zamów konsultację
          </a>
        </div>

        <button
          className={`header__burger ${isOpen ? "is-open" : ""}`}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </motion.header>
  );
};

export default Header;
