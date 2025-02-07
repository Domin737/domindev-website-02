import { useState, FormEvent } from "react";
import "./Contact.scss";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Tutaj będzie logika wysyłania formularza
    console.log("Form submitted:", formData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <section id="contact" className="section contact">
      <div className="container">
        <h2>Kontakt</h2>
        <div className="contact__content">
          <div className="contact__info">
            <h3>Skontaktuj się ze mną</h3>
            <p>
              Chętnie odpowiem na Twoje pytania i pomogę w realizacji projektu
              WordPress.
            </p>
            <div className="contact__details">
              <div className="contact__detail">
                <i className="fas fa-envelope"></i>
                <a href="mailto:kontakt@domindev.pl">kontakt@domindev.pl</a>
              </div>
              <div className="contact__detail">
                <i className="fas fa-phone"></i>
                <a href="tel:+48500600700">+48 500 600 700</a>
              </div>
              <div className="contact__social">
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact__social-link"
                >
                  <i className="fab fa-linkedin"></i>
                </a>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact__social-link"
                >
                  <i className="fab fa-github"></i>
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact__social-link"
                >
                  <i className="fab fa-facebook"></i>
                </a>
              </div>
            </div>
          </div>
          <form className="contact__form" onSubmit={handleSubmit}>
            <div className="form__group">
              <label htmlFor="name">Imię i nazwisko</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form__group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form__group">
              <label htmlFor="message">Wiadomość</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={5}
              ></textarea>
            </div>
            <button type="submit" className="btn btn-primary">
              Wyślij wiadomość
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Contact;
