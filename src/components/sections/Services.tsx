import "./Services.scss";

const Services = () => {
  const services = [
    {
      icon: "fas fa-laptop-code",
      title: "Tworzenie Stron WordPress",
      description:
        "Projektuję i tworzę nowoczesne strony WordPress dostosowane do Twoich potrzeb.",
    },
    {
      icon: "fas fa-paint-brush",
      title: "Redesign i Modyfikacje",
      description:
        "Odświeżam istniejące strony WordPress, wprowadzając nowoczesne rozwiązania i poprawiając UX.",
    },
    {
      icon: "fas fa-tachometer-alt",
      title: "Optymalizacja",
      description:
        "Zwiększam szybkość działania stron i optymalizuję je pod kątem SEO.",
    },
    {
      icon: "fas fa-plug",
      title: "Integracje",
      description:
        "Implementuję i konfiguruję pluginy oraz integruję zewnętrzne systemy.",
    },
    {
      icon: "fas fa-shield-alt",
      title: "Wsparcie i Opieka",
      description:
        "Zapewniam regularne aktualizacje, kopie zapasowe i wsparcie techniczne.",
    },
    {
      icon: "fas fa-mobile-alt",
      title: "RWD",
      description:
        "Tworzę strony w pełni responsywne, działające perfekcyjnie na każdym urządzeniu.",
    },
  ];

  return (
    <section id="services" className="section services">
      <div className="container">
        <h2>Usługi</h2>
        <div className="services__grid">
          {services.map((service, index) => (
            <div key={index} className="services__item">
              <i className={service.icon}></i>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </div>
          ))}
        </div>
        <div className="services__cta">
          <p>Potrzebujesz wsparcia przy projekcie WordPress?</p>
          <a href="#contact" className="btn btn-primary">
            Skontaktuj się
          </a>
        </div>
      </div>
    </section>
  );
};

export default Services;
