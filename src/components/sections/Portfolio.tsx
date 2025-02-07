import { useState } from "react";
import "./Portfolio.scss";

const Portfolio = () => {
  const projects = [
    {
      title: "E-commerce WordPress",
      description:
        "Sklep internetowy oparty na WooCommerce z niestandardowymi funkcjami.",
      category: "E-commerce",
      image: "/images/portfolio/project1.jpg",
    },
    {
      title: "Portal Informacyjny",
      description:
        "Nowoczesny portal z zaawansowanym systemem kategoryzacji treści.",
      category: "Portal",
      image: "/images/portfolio/project2.jpg",
    },
    {
      title: "Strona Firmowa",
      description:
        "Elegancka strona korporacyjna z systemem zarządzania treścią.",
      category: "Business",
      image: "/images/portfolio/project3.jpg",
    },
    {
      title: "Blog Lifestyle",
      description: "Personalizowany motyw WordPress dla popularnego bloga.",
      category: "Blog",
      image: "/images/portfolio/project4.jpg",
    },
    {
      title: "Platforma Edukacyjna",
      description:
        "System e-learningowy z integracją płatności i kursów online.",
      category: "E-learning",
      image: "/images/portfolio/project5.jpg",
    },
    {
      title: "Strona Restauracji",
      description: "Strona z systemem rezerwacji i menu online.",
      category: "Gastronomia",
      image: "/images/portfolio/project6.jpg",
    },
  ];

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section id="portfolio" className="section portfolio">
      <div className="container">
        <h2>Portfolio</h2>
        <div className="portfolio__grid">
          {projects.map((project, index) => (
            <div
              key={index}
              className="portfolio__item"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="portfolio__image">
                <img src={project.image} alt={project.title} />
              </div>
              <div
                className={`portfolio__overlay ${
                  hoveredIndex === index ? "portfolio__overlay--active" : ""
                }`}
              >
                <span className="portfolio__category">{project.category}</span>
                <h3>{project.title}</h3>
                <p>{project.description}</p>
                <a href="#contact" className="btn btn-primary">
                  Szczegóły projektu
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Portfolio;
