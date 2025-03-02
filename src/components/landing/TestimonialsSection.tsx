import { Quote } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  avatarSrc?: string;
}

const TestimonialsSection = () => {
  const testimonialPairs = [
    {
      front: {
        quote: "EduSync AI completely changed how I study. Their personalized study plans helped me ace my finals!",
        author: "Sarah Johnson",
        role: "Computer Science Student",
      },
      back: {
        quote: "The AI assistant feels like having a tutor available 24/7. It explains complex topics in ways I can understand.",
        author: "James Wilson",
        role: "Engineering Student",
      }
    },
    {
      front: {
        quote: "The AI-powered flashcards and quizzes make learning so much more engaging. I'm retaining information better than ever.",
        author: "Michael Chen",
        role: "Medical Student",
      },
      back: {
        quote: "I've tried many study apps, but EduSync AI is the first one that adapts to my learning style. Game changer!",
        author: "Emma Rodriguez",
        role: "Psychology Student",
      }
    },
    {
      front: {
        quote: "As a working professional, I needed flexibility. EduSync AI adapts to my schedule and learning pace perfectly.",
        author: "Aisha Patel",
        role: "Business Analytics Professional",
      },
      back: {
        quote: "The visualization tools helped me understand complex data structures that I struggled with for months.",
        author: "Thomas Lee",
        role: "Data Science Professional",
      }
    },
  ];

  const [flippedCards, setFlippedCards] = useState<boolean[]>([false, false, false]);
  
  const toggleFlip = (index: number) => {
    const newFlippedCards = [...flippedCards];
    newFlippedCards[index] = !newFlippedCards[index];
    setFlippedCards(newFlippedCards);
  };

  useEffect(() => {
    const intervals = testimonialPairs.map((_, index) => {
      return setInterval(() => {
        setFlippedCards(prev => {
          const newState = [...prev];
          newState[index] = !newState[index];
          return newState;
        });
      }, 8000 + (index * 2000));
    });
    
    return () => {
      intervals.forEach(interval => clearInterval(interval));
    };
  }, []);

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

  return (
    <div className="py-16 md:py-24 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-500/20 rounded-full filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-32 -right-24 w-64 h-64 bg-orange-500/20 rounded-full filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-24 left-48 w-64 h-64 bg-cyan-500/20 rounded-full filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
      
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
          {testimonialPairs.map((pair, index) => (
            <motion.div 
              key={index}
              variants={itemVariants}
              className="flex flex-col h-full"
              style={{ perspective: "1500px" }}
            >
              <div 
                className="relative w-full h-full min-h-[280px] cursor-pointer"
                onClick={() => toggleFlip(index)}
              >
                <motion.div 
                  className="absolute inset-0 w-full h-full backface-hidden"
                  animate={{ 
                    rotateY: flippedCards[index] ? 180 : 0,
                    opacity: flippedCards[index] ? 0 : 1,
                    zIndex: flippedCards[index] ? 0 : 1
                  }}
                  transition={{ 
                    duration: 1.2,
                    type: "spring", 
                    stiffness: 70,
                    damping: 15
                  }}
                >
                  <div className="bg-gradient-to-b from-indigo-500/80 to-purple-600/80 backdrop-blur-sm p-1 rounded-2xl shadow-xl h-full">
                    <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl p-6 h-full flex flex-col">
                      <Quote className="text-orange-400 w-10 h-10 mb-4" />
                      <p className="text-white/90 italic mb-6 flex-grow">"{pair.front.quote}"</p>
                      <div className="flex items-center mt-auto">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full h-12 w-12 flex items-center justify-center text-white font-bold text-lg">
                          {pair.front.author.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <h4 className="text-white font-semibold">{pair.front.author}</h4>
                          <p className="text-white/70 text-sm">{pair.front.role}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  className="absolute inset-0 w-full h-full backface-hidden"
                  animate={{ 
                    rotateY: flippedCards[index] ? 0 : -180,
                    opacity: flippedCards[index] ? 1 : 0,
                    zIndex: flippedCards[index] ? 1 : 0
                  }}
                  transition={{ 
                    duration: 1.2,
                    type: "spring", 
                    stiffness: 70,
                    damping: 15
                }}
                >
                  <div className="bg-gradient-to-b from-purple-600/80 to-indigo-500/80 backdrop-blur-sm p-1 rounded-2xl shadow-xl h-full">
                    <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl p-6 h-full flex flex-col">
                      <Quote className="text-orange-400 w-10 h-10 mb-4" />
                      <p className="text-white/90 italic mb-6 flex-grow">"{pair.back.quote}"</p>
                      <div className="flex items-center mt-auto">
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full h-12 w-12 flex items-center justify-center text-white font-bold text-lg">
                          {pair.back.author.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <h4 className="text-white font-semibold">{pair.back.author}</h4>
                          <p className="text-white/70 text-sm">{pair.back.role}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>
        
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <div className="h-full w-full" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        </div>
      </div>

      <style>
        {`
          .backface-hidden {
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
            transform-style: preserve-3d;
            -webkit-transform-style: preserve-3d;
            transition: transform 1.2s;
          }
        `}
      </style>
    </div>
  );
};

export default TestimonialsSection;
