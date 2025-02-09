import { FaGithub, FaLinkedin, FaFacebook } from "react-icons/fa";
import { Link } from "react-scroll";
import "./Footer.scss";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const mainLinks = [
    { name: "Home", to: "hero" },
    { name: "O mnie", to: "about" },
    { name: "Usługi", to: "services" },
    { name: "Portfolio", to: "portfolio" },
    { name: "FAQ", to: "faq" },
    { name: "Kontakt", to: "contact" },
  ];

  const legalLinks = [
    { name: "Polityka prywatności", href: "#" },
    { name: "Regulamin", href: "#" },
  ];

  const socialLinks = [
    { name: "LinkedIn", icon: FaLinkedin, href: "https://linkedin.com" },
    { name: "GitHub", icon: FaGithub, href: "https://github.com" },
    { name: "Facebook", icon: FaFacebook, href: "https://facebook.com" },
  ];

  return (
    <footer className="footer">
      <div className="container footer__container">
        <div className="footer__main">
          <div className="footer__brand">
            <Link
              to="hero"
              smooth={true}
              duration={500}
              className="footer__logo"
            >
              DominDev
            </Link>
            <p className="footer__description">WordPress Development</p>
            <ul className="footer__social">
              {socialLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.name}
                    >
                      <Icon />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="footer__links">
            <h4>Szybkie linki</h4>
            <ul>
              {mainLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} smooth={true} duration={500} offset={-100}>
                    {link.name}
                  </Link>
                </li>
              ))}
              {legalLinks.map((link) => (
                <li key={link.name}>
                  <a href={link.href}>{link.name}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <p>&copy; {currentYear} DominDev. Wszelkie prawa zastrzeżone.</p>
          <div className="footer__contact">
            <a href="mailto:kontakt@domindev.pl">kontakt@domindev.pl</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
