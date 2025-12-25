
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
      className="relative group cursor-zoom-in rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(prompt)}
    >
      <div className="relative">
        <img 
          src={prompt.imageUrl} 
          alt={prompt.title}
          className="w-full h-auto block"
          loading="lazy"
        />
        {/* Detail Overlay */}
        <div className={`absolute inset-0 bg-slate-900/40 p-4 transition-opacity duration-300 flex flex-col justify-end ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="space-y-1">
            <h3 className="font-bold text-white text-sm truncate">{prompt.title}</h3>
            <p className="text-[10px] font-medium text-white/80">by {prompt.author}</p>
          </div>
        </div>
      </div>
      
      {/* Dynamic Tags on Bottom (Visible on non-hover to keep cards clean) */}
      <div className="p-3 bg-white border-t border-slate-50 flex flex-wrap gap-1">
        {prompt.tags.slice(0, 2).map(tag => (
          <span key={tag} className="px-1.5 py-0.5 bg-slate-50 text-slate-400 border border-slate-100 rounded text-[8px] font-bold uppercase">#{tag}</span>
        ))}
      </div>
    </div>
  );
};

export default PromptCard;
