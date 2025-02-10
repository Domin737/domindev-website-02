export interface PortfolioProject {
  title: string;
  description: string;
  category: string;
  image: string;
}

export const portfolioProjects: PortfolioProject[] = [
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
    description: "System e-learningowy z integracją płatności i kursów online.",
    category: "E-learning",
    image: "/images/portfolio/project5.jpg",
  },
  {
    title: "Strona Restauracji",
    description: "Strona z systemem rezerwacji i menu online.",
    category: "Gastronomia",
    image: "/images/portfolio/project6.jpg",
  },
] as const;
