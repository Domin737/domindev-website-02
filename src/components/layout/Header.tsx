import { useState, useEffect, useContext } from "react";
import { ThemeContext } from "../../App";
import { Link } from "react-scroll";
import { motion, useScroll } from "framer-motion";
import { FaGithub, FaLinkedin, FaTwitter } from "react-icons/fa";
import "./Header.scss";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const updateScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", updateScroll);
    return () => window.removeEventListener("scroll", updateScroll);
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);

  const menuItems = [
    { name: "Home", to: "hero" },
    { name: "O mnie", to: "about" },
    { name: "Usługi", to: "services" },
    { name: "Portfolio", to: "portfolio" },
    { name: "FAQ", to: "faq" },
    { name: "Kontakt", to: "contact" },
  ];

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
                ? "/images/logos/logo-domindev-white-transparentbg-1448x1448.svg"
                : "/images/logos/logo-domindev-black-transparentbg-1448x1448.svg"
            }
            alt="DominDev Logo"
            className="header__logo-img"
          />
          <span>DominDev</span>
        </Link>

        <nav className={`header__nav ${isOpen ? "is-open" : ""}`}>
          <ul className="header__menu">
            {menuItems.map((item) => (
              <li key={item.to} className="header__menu-item">
                <Link
                  to={item.to}
                  smooth={true}
                  duration={500}
                  offset={-100}
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
          <div className="header__social">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaGithub />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaLinkedin />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaTwitter />
            </a>
          </div>
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
