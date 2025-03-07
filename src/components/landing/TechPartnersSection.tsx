import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
interface PartnerLogo {
  name: string;
  image: string;
  alt: string;
}
const TechPartnersSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const partners: PartnerLogo[] = [{
    name: "OpenAI",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/OpenAI_Logo.svg/1024px-OpenAI_Logo.svg.png",
    alt: "OpenAI Logo"
  }, {
    name: "Perplexity",
    image: "public/lovable-uploads/9f0e116f-f4dd-419f-903f-820f5ad56e08.png",
    alt: "Perplexity Logo"
  }, {
    name: "Grok",
    image: "public/lovable-uploads/cb7788ae-2e82-482c-95a3-c4a34287fa9a.png",
    alt: "X.ai Logo"
  }, {
    name: "MistralAI",
    image: "public/lovable-uploads/5e7d57a9-e929-4995-8863-537f267089dc.png",
    alt: "MistralAI Logo"
  }, {
    name: "Anthropic",
    image: "public/lovable-uploads/a21a04a4-1298-4d9f-ae4f-4431e76715d5.png",
    alt: "Anthropic Logo"
  }, {
    name: "Landing.ai",
    image: "public/lovable-uploads/52af45c5-9ce8-4340-8ed7-afe53be65e34.png",
    alt: "Landing.ai Logo"
  }];
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setIsVisible(true);
        // Once we've seen it, no need to keep observing
        if (sectionRef.current) {
          observer.unobserve(sectionRef.current);
        }
      }
    }, {
      threshold: 0.2
    } // 20% of the section is visible
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

  // Animation variants for the container and items
  const containerVariants = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2
      }
    }
  };
  const itemVariants = {
    hidden: {
      y: 20,
      opacity: 0
    },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10
      }
    }
  };
  return <div ref={sectionRef} className="py-16 md:py-20 overflow-hidden bg-white relative">
      {/* Background elements */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-100 to-indigo-100"></div>
        <svg className="absolute left-0 top-1/4 w-40 h-40 text-purple-200 opacity-30" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M44.9,-76.2C59.7,-69.7,74.4,-60.4,83.3,-46.5C92.2,-32.7,95.4,-14.4,93.1,2.8C90.9,20,83.3,36.2,72.5,49.7C61.7,63.3,47.7,74.2,32.4,78.5C17.1,82.7,0.6,80.4,-14.5,75.7C-29.7,70.9,-43.6,63.9,-56.3,53.6C-69.1,43.3,-80.8,29.9,-85.7,14C-90.6,-2,-88.7,-20.4,-81.7,-36.3C-74.8,-52.2,-62.8,-65.7,-48.4,-72.4C-34,-79,-17,-78.9,-0.5,-78.1C16,-77.3,32,-82.8,44.9,-76.2Z" transform="translate(100 100)" />
        </svg>
        <svg className="absolute right-0 bottom-1/4 w-40 h-40 text-indigo-200 opacity-30" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M47.7,-73.3C62.1,-66.3,74.5,-53.9,79.1,-39.1C83.8,-24.3,80.8,-7,76.8,8.8C72.8,24.6,67.8,38.9,58.3,49.7C48.8,60.5,34.7,67.9,19.8,71.8C4.9,75.7,-10.9,76.1,-25.2,72.1C-39.6,68.1,-52.5,59.6,-63.1,48.1C-73.7,36.5,-82,21.9,-84.5,5.9C-87,-10.1,-83.7,-27.6,-75.1,-42.3C-66.5,-57,-52.6,-69,-37.7,-75.3C-22.7,-81.7,-6.8,-82.3,8.6,-79.7C24,-77.1,48,-80.3,47.7,-73.3Z" transform="translate(100 100)" />
        </svg>
      </div>

      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Powered by World-Leading AI Models
            </span>
          </h2>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            EduSync integrates cutting-edge technology from the most innovative AI companies in the world to deliver an exceptional learning experience.
          </p>
        </div>

        <motion.div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-8 max-w-5xl mx-auto" initial="hidden" animate={isVisible ? "visible" : "hidden"} variants={containerVariants}>
          {partners.map((partner, index) => <motion.div key={index} className="flex flex-col items-center" variants={itemVariants}>
              <Card className="w-full h-24 hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-4 flex items-center justify-center h-full">
                  <img src={partner.image} alt={partner.alt} className="h-12 md:h-14 object-contain" onError={e => {
                // Fallback for any broken image links
                e.currentTarget.src = "https://via.placeholder.com/150?text=AI+Partner";
              }} />
                </CardContent>
              </Card>
              
            </motion.div>)}
        </motion.div>
      </div>
    </div>;
};
export default TechPartnersSection;