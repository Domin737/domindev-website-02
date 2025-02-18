import "./Hero.scss";

const Hero = () => {
  return (
    <section className="hero" id="hero">
      <div className="container hero__container">
        <div className="hero__content">
          <div className="hero__text">
            <h1 className="hero__title">Zdominuj konkurencję!</h1>
            <p className="hero__subtitle">Twój sukces to nasza misja.</p>
          </div>

          <div className="hero__cta">
            <a href="#portfolio" className="btn btn-primary">
              Portfolio
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
