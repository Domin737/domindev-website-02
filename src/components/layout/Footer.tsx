import { FaGithub, FaTwitter, FaTelegram, FaDiscord } from "react-icons/fa";
import { Link } from "react-scroll";
import "./Footer.scss";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const mainLinks = [
    { name: "About", to: "about" },
    { name: "Roadmap", to: "roadmap" },
    { name: "FAQ", to: "faq" },
  ];

  const legalLinks = [
    { name: "Privacy Policy", href: "#" },
    { name: "Terms of Service", href: "#" },
  ];

  const socialLinks = [
    { name: "GitHub", icon: FaGithub, href: "#" },
    { name: "Twitter", icon: FaTwitter, href: "#" },
    { name: "Telegram", icon: FaTelegram, href: "#" },
    { name: "Discord", icon: FaDiscord, href: "#" },
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
              Fearless
            </Link>
            <p className="footer__description">Multi-Chain Crypto Management</p>
          </div>

          <nav className="footer__nav">
            <div className="footer__links">
              <h4>Navigation</h4>
              <ul>
                {mainLinks.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      smooth={true}
                      duration={500}
                      offset={-100}
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="footer__links">
              <h4>Legal</h4>
              <ul>
                {legalLinks.map((link) => (
                  <li key={link.name}>
                    <a href={link.href}>{link.name}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="footer__links">
              <h4>Community</h4>
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
          </nav>
        </div>

        <div className="footer__bottom">
          <p>&copy; {currentYear} Fearless. All rights reserved.</p>
          <a
            href="https://github.com/fearless-wallet"
            target="_blank"
            rel="noopener noreferrer"
            className="footer__github"
          >
            View on GitHub
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
