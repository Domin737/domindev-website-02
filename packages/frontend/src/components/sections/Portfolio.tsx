import { useState, memo, useCallback } from "react";
import {
  portfolioProjects,
  type PortfolioProject,
} from "../../data/portfolioProjects";
import { useImageLoad } from "../../hooks/useImageLoad";
import "./Portfolio.scss";

interface ProjectImageProps {
  src: string;
  alt: string;
}

const ProjectImage = memo(({ src, alt }: ProjectImageProps) => {
  const { isLoading, error, handleImageLoad, handleImageError } =
    useImageLoad();

  return (
    <div className="portfolio__image">
      {isLoading && <div className="portfolio__image-loader">Ładowanie...</div>}
      {error && <div className="portfolio__image-error">{error}</div>}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        width="400"
        height="300"
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{ opacity: isLoading ? 0 : 1 }}
      />
    </div>
  );
});

ProjectImage.displayName = "ProjectImage";

interface ProjectOverlayProps {
  project: PortfolioProject;
  isActive: boolean;
}

const ProjectOverlay = memo(({ project, isActive }: ProjectOverlayProps) => (
  <div
    className={`portfolio__overlay ${
      isActive ? "portfolio__overlay--active" : ""
    }`}
  >
    <span className="portfolio__category">{project.category}</span>
    <h3>{project.title}</h3>
    <p>{project.description}</p>
    <a href="#contact" className="btn btn-primary">
      Szczegóły projektu
    </a>
  </div>
));

ProjectOverlay.displayName = "ProjectOverlay";

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
      <ProjectImage src={project.image} alt={project.title} />
      <ProjectOverlay project={project} isActive={isHovered} />
    </div>
  )
);

ProjectItem.displayName = "ProjectItem";

const PortfolioGrid = memo(
  ({
    hoveredIndex,
    onHover,
  }: {
    hoveredIndex: number | null;
    onHover: (index: number | null) => void;
  }) => (
    <div className="portfolio__grid">
      {portfolioProjects.map((project, index) => (
        <ProjectItem
          key={project.title}
          project={project}
          isHovered={hoveredIndex === index}
          onMouseEnter={() => onHover(index)}
          onMouseLeave={() => onHover(null)}
        />
      ))}
    </div>
  )
);

PortfolioGrid.displayName = "PortfolioGrid";

const Portfolio = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleHover = useCallback((index: number | null) => {
    setHoveredIndex(index);
  }, []);

  return (
    <section id="portfolio" className="section portfolio">
      <div className="container">
        <h2>Portfolio</h2>
        <PortfolioGrid hoveredIndex={hoveredIndex} onHover={handleHover} />
      </div>
    </section>
  );
};

export default Portfolio;
