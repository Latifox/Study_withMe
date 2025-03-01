
import { BookOpen } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-white/30 backdrop-blur-sm py-12 border-t border-purple-100">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <BookOpen className="h-5 w-5 text-purple-600" />
            <span className="text-lg font-bold text-gray-800">EduSync AI</span>
          </div>
          <div className="text-sm text-gray-600">
            © {new Date().getFullYear()} EduSync AI. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
