
import { Quote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  avatarSrc?: string;
}

const TestimonialsSection = () => {
  // Extended testimonials array with two sides for each card
  const testimonials: { front: Testimonial, back: Testimonial }[] = [
    {
      front: {
        quote: "EduSync AI completely changed how I study. Their personalized study plans helped me ace my finals!",
        author: "Sarah Johnson",
        role: "Computer Science Student",
      },
      back: {
        quote: "The adaptive learning features identified my weak areas and helped me focus on what I needed most.",
        author: "Sarah Johnson",
        role: "Computer Science Student",
      }
    },
    {
      front: {
        quote: "The AI-powered flashcards and quizzes make learning so much more engaging. I'm retaining information better than ever.",
        author: "Michael Chen",
        role: "Medical Student",
      },
      back: {
        quote: "I love how it adapts to my learning style. It's like having a personal tutor available 24/7.",
        author: "Michael Chen",
        role: "Medical Student",
      }
    },
    {
      front: {
        quote: "As a working professional, I needed flexibility. EduSync AI adapts to my schedule and learning pace perfectly.",
        author: "Aisha Patel",
        role: "Business Analytics Professional",
      },
      back: {
        quote: "The spaced repetition system ensures I never forget important concepts, even with my busy schedule.",
        author: "Aisha Patel",
        role: "Business Analytics Professional",
      }
    },
  ];

  // State to track which cards are flipped
  const [flippedCards, setFlippedCards] = useState<boolean[]>(
    Array(testimonials.length).fill(false)
  );

  // Auto-flip functionality
  useEffect(() => {
    const intervalIds = testimonials.map((_, index) => {
      return setInterval(() => {
        setFlippedCards(prev => {
          const newState = [...prev];
          newState[index] = !newState[index];
          return newState;
        });
      }, 6000 + (index * 2000)); // Staggered auto-flip timing
    });

    return () => {
      intervalIds.forEach(id => clearInterval(id));
    };
  }, [testimonials.length]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  // Handle manual card flip
  const handleCardClick = (index: number) => {
    setFlippedCards(prev => {
      const newState = [...prev];
      newState[index] = !newState[index];
      return newState;
    });
  };

  return (
    <div className="py-16 md:py-24 relative overflow-hidden">
      {/* Gradient blobs in background */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-500/20 rounded-full filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-32 -right-24 w-64 h-64 bg-purple-400/20 rounded-full filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-24 left-48 w-64 h-64 bg-purple-300/20 rounded-full filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-xl hover:shadow-2xl transition-shadow mx-auto max-w-3xl relative inline-block">
            <div className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-purple-700 via-purple-500 to-indigo-500 -z-10"></div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              What Our Users Say
            </h2>
            <p className="text-lg text-white">
              Discover how EduSync AI is transforming the learning experience
            </p>
          </div>
        </div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {testimonials.map((testimonial, index) => (
            <motion.div 
              key={index}
              variants={itemVariants}
              className="h-full"
            >
              <div 
                className="perspective-1000 cursor-pointer h-full" 
                onClick={() => handleCardClick(index)}
              >
                <div 
                  className={`relative w-full h-full transition-all duration-500 transform-style-3d ${
                    flippedCards[index] ? "rotate-y-180" : ""
                  }`}
                >
                  {/* Front of card */}
                  <div className="bg-gradient-to-b from-purple-500/80 to-indigo-600/80 backdrop-blur-sm p-1 rounded-2xl shadow-xl absolute w-full h-full backface-hidden">
                    <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl p-6 h-full flex flex-col">
                      <Quote className="text-purple-400 w-10 h-10 mb-4" />
                      <p className="text-white/90 italic mb-6 flex-grow">"{testimonial.front.quote}"</p>
                      <div className="flex items-center mt-auto">
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full h-12 w-12 flex items-center justify-center text-white font-bold text-lg">
                          {testimonial.front.author.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <h4 className="text-white font-semibold">{testimonial.front.author}</h4>
                          <p className="text-white/70 text-sm">{testimonial.front.role}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Back of card */}
                  <div className="bg-gradient-to-b from-indigo-600/80 to-purple-500/80 backdrop-blur-sm p-1 rounded-2xl shadow-xl absolute w-full h-full backface-hidden rotate-y-180">
                    <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl p-6 h-full flex flex-col">
                      <Quote className="text-purple-400 w-10 h-10 mb-4" />
                      <p className="text-white/90 italic mb-6 flex-grow">"{testimonial.back.quote}"</p>
                      <div className="flex items-center mt-auto">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full h-12 w-12 flex items-center justify-center text-white font-bold text-lg">
                          {testimonial.back.author.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <h4 className="text-white font-semibold">{testimonial.back.author}</h4>
                          <p className="text-white/70 text-sm">{testimonial.back.role}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
        
        {/* Decorative dots pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <div className="h-full w-full" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        </div>
      </div>
    </div>
  );
};

export default TestimonialsSection;
