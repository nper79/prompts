
import React, { useState } from 'react';
import { PromptItem } from '../types';

interface PromptCardProps {
  prompt: PromptItem;
  onSelect: (prompt: PromptItem) => void;
}

const PromptCard: React.FC<PromptCardProps> = ({ prompt, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative group overflow-hidden rounded-2xl cursor-zoom-in"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(prompt)}
    >
      <div className="relative">
        <img 
          src={prompt.imageUrl} 
          alt={prompt.title}
          className="w-full h-auto object-cover transition-filter duration-300"
          loading="lazy"
        />
        {/* Subtle Dark Gradient Overlay on Hover */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 flex flex-col justify-end p-4 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          
          <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
            <h3 className="font-bold text-white leading-tight drop-shadow-md">{prompt.title}</h3>
            <div className="flex items-center gap-2 mt-2">
               <div className="w-5 h-5 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-[10px] text-white font-bold uppercase">
                  {prompt.author.charAt(0)}
               </div>
               <span className="text-xs text-white/90 font-medium truncate">{prompt.author}</span>
            </div>
          </div>

          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity delay-100">
             <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-bold text-black uppercase tracking-wide">
                JSON
             </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptCard;
