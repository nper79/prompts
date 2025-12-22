
import React, { useState, useMemo, useEffect } from 'react';
import { ViewMode, PromptItem } from './types';
import { INITIAL_PROMPTS, CATEGORIES } from './constants';
import PromptCard from './components/PromptCard';
import Creator from './components/Creator';
import SubmissionForm from './components/SubmissionForm';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.EXPLORE);
  const [prompts, setPrompts] = useState<PromptItem[]>(() => {
    try {
      const saved = localStorage.getItem('jsonprompts_data');
      return saved ? JSON.parse(saved) : INITIAL_PROMPTS;
    } catch (e) {
      console.error("Failed to load prompts from storage", e);
      return INITIAL_PROMPTS;
    }
  });
  
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPrompt, setSelectedPrompt] = useState<PromptItem | null>(null);
  const [prefilledSubmission, setPrefilledSubmission] = useState<Partial<PromptItem> | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Sync with localStorage safely
  useEffect(() => {
    try {
      localStorage.setItem('jsonprompts_data', JSON.stringify(prompts));
    } catch (e) {
      console.warn("Storage quota exceeded.", e);
    }
  }, [prompts]);

  const filteredPrompts = useMemo(() => {
    return prompts.filter(p => {
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = p.title.toLowerCase().includes(searchLower) || 
                           p.json.toLowerCase().includes(searchLower);
      return matchesCategory && matchesSearch;
    });
  }, [prompts, selectedCategory, searchQuery]);

  const handlePostPrompt = (imageUrl: string, json: string) => {
    setPrefilledSubmission({ imageUrl, json });
    setView(ViewMode.SUBMIT);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddPrompt = (newPromptData: Omit<PromptItem, 'id' | 'createdAt'>) => {
    const newPrompt: PromptItem = {
      ...newPromptData,
      id: `p-${Date.now()}`,
      createdAt: new Date().toLocaleDateString()
    };
    
    setPrompts(prev => [newPrompt, ...prev]);
    setPrefilledSubmission(null);
    setSelectedCategory('All');
    setSearchQuery('');
    setSelectedPrompt(null);
    setView(ViewMode.EXPLORE);
    setShowSuccessToast(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const resetStorage = () => {
    if (confirm("This will delete all custom prompts. Continue?")) {
      localStorage.removeItem('jsonprompts_data');
      setPrompts(INITIAL_PROMPTS);
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Success Notification */}
      {showSuccessToast && (
        <div className="fixed top-24 right-6 z-[100] animate-fade-in">
          <div className="bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-xl shadow-emerald-900/10 flex items-center gap-3">
            <i className="fa-solid fa-check-circle text-xl"></i>
            <div>
              <p className="font-bold">Prompt Published!</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation - Clean White with Slate Accents */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md px-6 py-4 border-b border-gray-200/50">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group" 
            onClick={() => { setView(ViewMode.EXPLORE); setSelectedPrompt(null); }}
          >
             <div className="bg-brand-gradient text-white w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-slate-500/20 group-hover:scale-105 transition-transform">
              <span className="font-bold text-lg font-mono">J</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-slate-600 transition-colors">
              JSONPrompts
            </h1>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-slate-100/80 rounded-full px-1 py-1 border border-slate-200/50">
             <button 
              onClick={() => { setView(ViewMode.EXPLORE); setSelectedPrompt(null); }}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${view === ViewMode.EXPLORE ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Home
            </button>
            <button 
              onClick={() => { setView(ViewMode.CREATE); setSelectedPrompt(null); }}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${view === ViewMode.CREATE ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Create
            </button>
          </div>

          <div className="flex items-center gap-4">
             {/* Submit Pill Button - Slate/Dark */}
             <button 
               onClick={() => { setView(ViewMode.SUBMIT); setSelectedPrompt(null); }}
               className="hidden sm:block bg-brand-gradient text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 hover:scale-105 transition-all active:scale-95"
            >
              Submit Prompt
            </button>
            
            <button 
              onClick={resetStorage}
              className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              title="Settings / Reset"
            >
               <i className="fa-solid fa-gear"></i>
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden ring-2 ring-white shadow-sm">
               <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=Felix" alt="User" />
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        {view === ViewMode.EXPLORE && (
          <div className="max-w-[1600px] mx-auto px-6 py-6 animate-fade-in">
            {selectedPrompt ? (
              <div className="max-w-7xl mx-auto mt-6">
                <button 
                  onClick={() => setSelectedPrompt(null)}
                  className="mb-8 px-4 py-2 rounded-full bg-white border border-slate-200 hover:border-slate-400 hover:text-slate-900 flex items-center justify-center gap-2 transition-all shadow-sm text-slate-600 text-sm font-medium"
                >
                  <i className="fa-solid fa-arrow-left"></i>
                  Back
                </button>
                
                <div className="flex flex-col lg:flex-row gap-12 bg-white rounded-[32px] p-6 lg:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.05)] border border-slate-100">
                  <div className="lg:w-2/3">
                    <div className="rounded-2xl overflow-hidden shadow-sm bg-slate-50">
                      <img src={selectedPrompt.imageUrl} className="w-full h-auto object-contain max-h-[85vh]" alt={selectedPrompt.title} />
                    </div>
                  </div>
                  
                  <div className="lg:w-1/3 space-y-8 flex flex-col">
                    <div>
                       <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 uppercase">
                           {selectedPrompt.author.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900">{selectedPrompt.author}</span>
                            {selectedPrompt.authorUrl && (
                                <a href={selectedPrompt.authorUrl} target="_blank" className="text-xs text-slate-500 hover:text-slate-800 transition-colors">
                                    @{selectedPrompt.authorUrl.split('.com/')[1] || 'social'}
                                </a>
                            )}
                        </div>
                      </div>
                      <h2 className="text-4xl font-bold text-slate-900 leading-tight">{selectedPrompt.title}</h2>
                      <span className="inline-block mt-4 px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-xs font-bold uppercase tracking-wide">{selectedPrompt.category}</span>
                    </div>

                    <div className="space-y-3 flex-grow bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">JSON Prompt</h3>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(selectedPrompt.json);
                            alert('JSON Copied!');
                          }}
                          className="text-slate-500 hover:text-slate-900 transition-colors bg-white border border-slate-200 px-2 py-1 rounded text-xs font-bold shadow-sm"
                        >
                          <i className="fa-regular fa-copy mr-1"></i> Copy
                        </button>
                      </div>
                      <pre className="code-font text-slate-600 text-xs sm:text-sm overflow-x-auto whitespace-pre-wrap break-words">
                        {selectedPrompt.json}
                      </pre>
                    </div>

                    <div className="pt-6">
                      <button 
                        onClick={() => {
                          setView(ViewMode.CREATE);
                          setSelectedPrompt(null);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-full bg-brand-gradient text-white px-6 py-4 rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-slate-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <i className="fa-solid fa-wand-magic-sparkles"></i>
                        Remix this Prompt
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Search Header */}
                <div className="mb-10 max-w-4xl mx-auto pt-6">
                   <div className="relative group">
                    <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-lg group-focus-within:text-slate-600 transition-colors"></i>
                    <input 
                      type="text" 
                      placeholder="Search for prompts, styles, or inspiration..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-full py-4 pl-14 pr-6 text-slate-900 placeholder-slate-400 text-lg shadow-lg shadow-slate-200/50 focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Filter Pills - Colored when active */}
                <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                        selectedCategory === cat 
                          ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' 
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400 hover:text-slate-900 hover:shadow-sm'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Masonry Layout - Modified to 3 Columns on Large screens for larger images */}
                <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
                  {filteredPrompts.length > 0 ? (
                    filteredPrompts.map(prompt => (
                      <div key={prompt.id} className="break-inside-avoid mb-6">
                        <PromptCard 
                          prompt={prompt} 
                          onSelect={(p) => setSelectedPrompt(p)} 
                        />
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-3xl border border-slate-100 break-inside-avoid shadow-sm">
                      <p className="text-xl">No matching prompts found.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {view === ViewMode.CREATE && (
          <div className="animate-fade-in">
            <Creator onPostToDirectory={handlePostPrompt} />
          </div>
        )}

        {view === ViewMode.SUBMIT && (
          <div className="animate-fade-in">
            <SubmissionForm 
              initialData={prefilledSubmission || {}} 
              onSubmit={handleAddPrompt}
              onCancel={() => {
                setView(ViewMode.EXPLORE);
                setPrefilledSubmission(null);
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
