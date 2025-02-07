import "./About.scss";

const About = () => {
  return (
    <section id="about" className="section about">
      <div className="container">
        <h2>O mnie</h2>
        <div className="about__content">
          <div className="about__text">
            <p>
              Jestem doświadczonym WordPress Developerem specjalizującym się w
              tworzeniu nowoczesnych i wydajnych stron internetowych. Moje
              podejście łączy techniczne know-how z kreatywnym designem, co
              pozwala tworzyć strony, które nie tylko świetnie wyglądają, ale
              również doskonale działają.
            </p>
            <ul className="about__skills">
              <li>
                <span className="gradient-text">5+ lat</span> doświadczenia z
                WordPress
              </li>
              <li>
                <span className="gradient-text">50+</span> zrealizowanych
                projektów
              </li>
              <li>
                <span className="gradient-text">100%</span> zadowolonych
                klientów
              </li>
            </ul>
          </div>
          <div className="about__icons">
            <div className="about__icon">
              <i className="fas fa-code"></i>
              <span>Clean Code</span>
            </div>
            <div className="about__icon">
              <i className="fas fa-rocket"></i>
              <span>Optymalizacja</span>
            </div>
            <div className="about__icon">
              <i className="fas fa-mobile-alt"></i>
              <span>RWD</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
