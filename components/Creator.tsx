
import React, { useState } from 'react';
import { GenerationState } from '../types';
import { geminiService } from '../services/geminiService';

interface CreatorProps {
  onPostToDirectory: (imageUrl: string, json: string) => void;
}

const Creator: React.FC<CreatorProps> = ({ onPostToDirectory }) => {
  const [jsonInput, setJsonInput] = useState<string>(
    JSON.stringify({
      "subject": "Mystical owl",
      "lighting": "Golden hour glow",
      "style": "Impressionist painting",
      "colors": ["Amber", "Deep Blue", "Copper"],
      "resolution": "8k"
    }, null, 2)
  );

  const [generation, setGeneration] = useState<GenerationState>({
    loading: false,
    error: null,
    resultUrl: null
  });

  const handleGenerate = async () => {
    setGeneration({ ...generation, loading: true, error: null });
    try {
      const url = await geminiService.generateFromJSON(jsonInput);
      setGeneration({ loading: false, error: null, resultUrl: url });
    } catch (err: any) {
      setGeneration({ 
        loading: false, 
        error: err.message || "Failed to generate image. Please check your JSON format.", 
        resultUrl: null 
      });
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Editor Side */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Workbench</h2>
            <button 
              onClick={() => setJsonInput('{\n  "prompt": ""\n}')}
              className="text-xs px-3 py-1 bg-white border border-slate-200 rounded-full hover:border-red-300 hover:text-red-500 text-slate-500 transition-colors shadow-sm"
            >
              Clear
            </button>
          </div>
          
          <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-slate-500/20 focus-within:border-slate-500 transition-all">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              <span className="text-xs text-slate-400 ml-2 font-mono uppercase tracking-widest">schema.json</span>
            </div>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full h-[500px] p-6 bg-white code-font text-slate-800 text-sm focus:outline-none resize-none leading-relaxed"
              spellCheck={false}
              placeholder='{"prompt": "A beautiful sunset..."}'
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={generation.loading}
            className={`w-full py-4 rounded-full font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:shadow-slate-500/20 ${
              generation.loading 
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed' 
                : 'bg-brand-gradient text-white active:scale-[0.98]'
            }`}
          >
            {generation.loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                Generating...
              </>
            ) : (
              <>
                <i className="fa-solid fa-bolt"></i>
                Generate Image
              </>
            )}
          </button>
        </div>

        {/* Result Side */}
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-4 text-slate-900">Preview</h2>
          <div className="aspect-square rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden relative group shadow-inner">
            {generation.resultUrl ? (
              <>
                <img src={generation.resultUrl} className="w-full h-full object-contain" alt="Generation result" />
                <div className="absolute bottom-6 right-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onPostToDirectory(generation.resultUrl!, jsonInput)}
                    className="bg-black/80 backdrop-blur-md px-6 py-3 rounded-full text-white font-bold shadow-lg hover:bg-black transition-colors flex items-center gap-2"
                  >
                    <i className="fa-solid fa-upload"></i>
                    Post
                  </button>
                  <a 
                    href={generation.resultUrl} 
                    download="jsonprompt-gen.png"
                    className="bg-white/90 backdrop-blur-md w-12 h-12 rounded-full hover:bg-white text-black flex items-center justify-center shadow-lg hover:text-slate-600 transition-colors"
                  >
                    <i className="fa-solid fa-download"></i>
                  </a>
                </div>
              </>
            ) : (
              <div className="text-center p-8 space-y-4">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <i className="fa-regular fa-image text-4xl"></i>
                </div>
                {generation.error ? (
                  <p className="text-red-500 font-medium bg-red-50 px-4 py-2 rounded-lg border border-red-100">{generation.error}</p>
                ) : (
                  <p className="text-slate-400 font-medium">
                    Rendered outputs will appear here.
                  </p>
                )}
              </div>
            )}
          </div>
          
          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-sm flex gap-3">
             <i className="fa-solid fa-circle-info mt-1 text-slate-400"></i>
             <p>
               Every generation is unique. The Gemini 2.5 Flash Image model interprets JSON keys as contextual weights.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Creator;
