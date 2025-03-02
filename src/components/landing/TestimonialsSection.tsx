
import { Quote } from "lucide-react";
import { motion } from "framer-motion";

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  avatarSrc?: string;
}

const TestimonialsSection = () => {
  const testimonials: Testimonial[] = [
    {
      quote: "EduSync AI completely changed how I study. Their personalized study plans helped me ace my finals!",
      author: "Sarah Johnson",
      role: "Computer Science Student",
    },
    {
      quote: "The AI-powered flashcards and quizzes make learning so much more engaging. I'm retaining information better than ever.",
      author: "Michael Chen",
      role: "Medical Student",
    },
    {
      quote: "As a working professional, I needed flexibility. EduSync AI adapts to my schedule and learning pace perfectly.",
      author: "Aisha Patel",
      role: "Business Analytics Professional",
    },
  ];

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
      {/* Gradient blobs in background */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-500/20 rounded-full filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-32 -right-24 w-64 h-64 bg-orange-500/20 rounded-full filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-24 left-48 w-64 h-64 bg-cyan-500/20 rounded-full filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-xl hover:shadow-2xl transition-shadow mx-auto max-w-3xl relative inline-block">
            <div className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-indigo-500 via-orange-500 to-cyan-500 -z-10"></div>
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
              className="flex flex-col h-full"
            >
              <div className="bg-gradient-to-b from-indigo-500/80 to-purple-600/80 backdrop-blur-sm p-1 rounded-2xl shadow-xl flex-grow h-full">
                <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl p-6 h-full flex flex-col">
                  <Quote className="text-orange-400 w-10 h-10 mb-4" />
                  <p className="text-white/90 italic mb-6 flex-grow">"{testimonial.quote}"</p>
                  <div className="flex items-center mt-auto">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full h-12 w-12 flex items-center justify-center text-white font-bold text-lg">
                      {testimonial.author.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <h4 className="text-white font-semibold">{testimonial.author}</h4>
                      <p className="text-white/70 text-sm">{testimonial.role}</p>
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
