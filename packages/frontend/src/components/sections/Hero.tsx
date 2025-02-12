import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import "./Hero.scss";

const Hero = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Array<{
      x: number;
      y: number;
      dx: number;
      dy: number;
      size: number;
    }> = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      particles = [];
      const numberOfParticles = Math.floor(
        (canvas.width * canvas.height) / 15000
      );

      for (let i = 0; i < numberOfParticles; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          dx: (Math.random() - 0.5) * 0.5,
          dy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2,
        });
      }
    };

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255, 0, 128, 0.2)";

      particles.forEach((particle) => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        particle.x += particle.dx;
        particle.y += particle.dy;

        if (particle.x < 0 || particle.x > canvas.width) particle.dx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.dy *= -1;
      });

      requestAnimationFrame(drawParticles);
    };

    resizeCanvas();
    createParticles();
    drawParticles();

    window.addEventListener("resize", () => {
      resizeCanvas();
      createParticles();
    });

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
    },
  };

  return (
    <section className="hero" id="hero">
      <canvas ref={canvasRef} className="hero__canvas" />
      <div className="container hero__container">
        <motion.div
          className="hero__content"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h1 variants={itemVariants} className="hero__title">
            Tworzę nowoczesne i skuteczne strony WordPress
          </motion.h1>
          <motion.p variants={itemVariants} className="hero__subtitle">
            Specjalizuję się w projektach, które przyciągają klientów i
            zwiększają zyski. Łączę nowoczesny design z wydajnym kodem.
          </motion.p>
          <motion.div variants={itemVariants} className="hero__cta">
            <a href="#portfolio" className="btn btn-primary">
              Zobacz portfolio
            </a>
            <a href="#contact" className="btn btn-secondary">
              Skontaktuj się
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          className="hero__image"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <img src="/images/mockup.svg" alt="WordPress Development" />
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
