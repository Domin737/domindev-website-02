import { useState, memo } from "react";
import {
  portfolioProjects,
  type PortfolioProject,
} from "../../data/portfolioProjects";
import "./Portfolio.scss";

interface ProjectItemProps {
  project: PortfolioProject;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const ProjectItem = memo(
  ({ project, isHovered, onMouseEnter, onMouseLeave }: ProjectItemProps) => (
    <div
      className="portfolio__item card"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="portfolio__image">
        <img
          src={project.image}
          alt={project.title}
          loading="lazy"
          width="400"
          height="300"
        />
      </div>
      <div
        className={`portfolio__overlay ${
          isHovered ? "portfolio__overlay--active" : ""
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
  )
);

ProjectItem.displayName = "ProjectItem";

const Portfolio = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section id="portfolio" className="section portfolio">
      <div className="container">
        <h2>Portfolio</h2>
        <div className="portfolio__grid">
          {portfolioProjects.map((project, index) => (
            <ProjectItem
              key={project.title}
              project={project}
              isHovered={hoveredIndex === index}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Portfolio;
