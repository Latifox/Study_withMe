
import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";

interface TechPartner {
  name: string;
  imgSrc: string;
}

const TechPartnersSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const techPartners: TechPartner[] = [
    { name: "OpenAI", imgSrc: "/tech-logos/openai-logo.svg" },
    { name: "Anthropic", imgSrc: "/tech-logos/anthropic-logo.svg" },
    { name: "Perplexity", imgSrc: "/tech-logos/perplexity-logo.svg" },
    { name: "Mistral AI", imgSrc: "/tech-logos/mistral-logo.svg" },
    { name: "Grok", imgSrc: "/tech-logos/grok-logo.svg" },
    { name: "Landing AI", imgSrc: "/tech-logos/landing-ai-logo.svg" },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    },
  };

  return (
    <div ref={sectionRef} className="container mx-auto px-4 py-16 md:py-20 relative overflow-hidden">
      {/* Background glow */}
      <div 
        className="absolute inset-0 z-0" 
        style={{
          background: 'radial-gradient(circle at center, rgba(147, 51, 234, 0.07) 0%, transparent 70%)',
          filter: 'blur(60px)'
        }}
      />
      
      {/* Dotted mesh background pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="h-full w-full" style={{ backgroundImage: 'radial-gradient(circle, rgba(147, 51, 234, 0.8) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      </div>
      
      <div className="text-center mb-12 relative z-10">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          EduSync is powered by{" "}
          <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            world-leading AI models
          </span>
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          We integrate cutting-edge technologies from the industry's most innovative AI companies
          to deliver an exceptional learning experience.
        </p>
      </div>

      <motion.div 
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-8 max-w-5xl mx-auto relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate={isVisible ? "visible" : "hidden"}
      >
        {techPartners.map((partner, index) => (
          <motion.div 
            key={index}
            className="flex flex-col items-center justify-center"
            variants={itemVariants}
          >
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 h-24 w-full flex items-center justify-center">
              <img 
                src={partner.imgSrc} 
                alt={`${partner.name} logo`} 
                className="max-h-12 max-w-full object-contain" 
                loading="lazy"
              />
            </div>
            <p className="mt-2 text-sm font-medium text-gray-700">{partner.name}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Bottom highlight border */}
      <div className="mt-12 h-px max-w-5xl mx-auto bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
    </div>
  );
};

export default TechPartnersSection;
