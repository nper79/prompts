
import React, { useState, useMemo, useEffect } from 'react';
import { ViewMode, PromptItem } from './types';
import { INITIAL_PROMPTS, CATEGORIES } from './constants';
import PromptCard from './components/PromptCard';
import Creator from './components/Creator';
import SubmissionForm from './components/SubmissionForm';
import { supabase } from './supabaseClient';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.EXPLORE);
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPrompt, setSelectedPrompt] = useState<PromptItem | null>(null);
  const [prefilledSubmission, setPrefilledSubmission] = useState<Partial<PromptItem> | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'local' | 'error'>('local');

  // Handle URL Routing and Query Params on Mount
  useEffect(() => {
    const handleRouting = () => {
      // Normalize path by removing trailing slash (unless it is just '/')
      let path = window.location.pathname;
      if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
      }
      
      const params = new URLSearchParams(window.location.search);

      // Extract query params for pre-filling (e.g., from extension/twitter)
      const queryData: Partial<PromptItem> = {};
      if (params.get('title')) queryData.title = params.get('title') || '';
      if (params.get('json')) queryData.json = params.get('json') || '';
      if (params.get('imageUrl')) queryData.imageUrl = params.get('imageUrl') || '';
      if (params.get('author')) queryData.author = params.get('author') || '';
      if (params.get('authorUrl')) queryData.authorUrl = params.get('authorUrl') || '';
      if (params.get('category')) queryData.category = params.get('category') || '';

      const hasQueryData = Object.keys(queryData).length > 0;

      if (path === '/submit') {
        setView(ViewMode.SUBMIT);
        if (hasQueryData) {
          setPrefilledSubmission(queryData);
        }
      } else if (path === '/create') {
        setView(ViewMode.CREATE);
      } else {
        setView(ViewMode.EXPLORE);
      }
    };

    handleRouting();

    // Listen for browser back/forward buttons
    window.addEventListener('popstate', handleRouting);
    return () => window.removeEventListener('popstate', handleRouting);
  }, []);

  // Update URL without reloading when changing views internally
  const navigateTo = (newView: ViewMode, data?: Partial<PromptItem>) => {
    let path = '/';
    if (newView === ViewMode.SUBMIT) path = '/submit';
    else if (newView === ViewMode.CREATE) path = '/create';

    window.history.pushState({}, '', path);
    setView(newView);
    
    if (data) {
      setPrefilledSubmission(data);
    } else {
      // Clear prefilled data if navigating manually unless passing data
      if (newView !== ViewMode.SUBMIT) setPrefilledSubmission(null);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (newView === ViewMode.EXPLORE) setSelectedPrompt(null);
  };

  // Load Data (Supabase or Local)
  useEffect(() => {
    const loadPrompts = async () => {
      setIsLoading(true);
      
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('prompts')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) throw error;
          
          setDbStatus('connected');
          
          if (data && data.length > 0) {
            const mappedPrompts: PromptItem[] = data.map((item: any) => ({
              id: item.id,
              title: item.title,
              category: item.category,
              json: item.json,
              imageUrl: item.image_url,
              author: item.author,
              authorUrl: item.author_url,
              createdAt: item.created_at
            }));
            setPrompts(mappedPrompts);
          } else {
            setPrompts(INITIAL_PROMPTS);
          }
        } catch (err) {
          console.error("Error loading from Supabase:", err);
          setDbStatus('error');
          setPrompts(INITIAL_PROMPTS);
        }
      } else {
        setDbStatus('local');
        try {
          const saved = localStorage.getItem('jsonprompts_data');
          setPrompts(saved ? JSON.parse(saved) : INITIAL_PROMPTS);
        } catch (e) {
          setPrompts(INITIAL_PROMPTS);
        }
      }
      setIsLoading(false);
    };

    loadPrompts();
  }, []);

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
    navigateTo(ViewMode.SUBMIT, { imageUrl, json });
  };

  const handleAddPrompt = async (newPromptData: Omit<PromptItem, 'id' | 'createdAt'>) => {
    setIsLoading(true);

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('prompts')
          .insert([
            {
              title: newPromptData.title,
              category: newPromptData.category,
              json: newPromptData.json,
              image_url: newPromptData.imageUrl,
              author: newPromptData.author,
              author_url: newPromptData.authorUrl,
            }
          ])
          .select();

        if (error) throw error;

        if (data) {
          const newPrompt: PromptItem = {
            id: data[0].id,
            title: data[0].title,
            category: data[0].category,
            json: data[0].json,
            imageUrl: data[0].image_url,
            author: data[0].author,
            authorUrl: data[0].author_url,
            createdAt: data[0].created_at
          };
          setPrompts(prev => [newPrompt, ...prev]);
        }
      } catch (err) {
        console.error("Error saving to Supabase:", err);
        alert("Failed to save to cloud database. Please check your Supabase credentials in Vercel.");
        setIsLoading(false);
        return; 
      }
    } else {
      const newPrompt: PromptItem = {
        ...newPromptData,
        id: `p-${Date.now()}`,
        createdAt: new Date().toLocaleDateString()
      };
      
      const updatedPrompts = [newPrompt, ...prompts];
      setPrompts(updatedPrompts);
      localStorage.setItem('jsonprompts_data', JSON.stringify(updatedPrompts));
    }

    setPrefilledSubmission(null);
    setSelectedCategory('All');
    setSearchQuery('');
    setSelectedPrompt(null);
    navigateTo(ViewMode.EXPLORE);
    setShowSuccessToast(true);
    setIsLoading(false);
    
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const resetStorage = () => {
    if (confirm("Do you want to reload data from the database?")) {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {showSuccessToast && (
        <div className="fixed top-24 right-6 z-[100] animate-fade-in">
          <div className="bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-xl flex items-center gap-3">
            <i className="fa-solid fa-check-circle text-xl"></i>
            <div><p className="font-bold">Published successfully!</p></div>
          </div>
        </div>
      )}

      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md px-6 py-4 border-b border-gray-200/50">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigateTo(ViewMode.EXPLORE)}>
             <div className="bg-brand-gradient text-white w-9 h-9 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <span className="font-bold text-lg font-mono">J</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">JSONPrompts</h1>
          </div>

          <div className="flex items-center gap-4">
             <button onClick={() => navigateTo(ViewMode.SUBMIT)} className="hidden sm:block bg-brand-gradient text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-lg hover:scale-105 transition-all">Submit</button>
             <button onClick={resetStorage} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"><i className="fa-solid fa-arrows-rotate"></i></button>
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        {view === ViewMode.EXPLORE && (
          <div className="max-w-[1600px] mx-auto px-6 py-6 animate-fade-in">
            {selectedPrompt ? (
              <div className="max-w-7xl mx-auto mt-6">
                <button onClick={() => setSelectedPrompt(null)} className="mb-8 px-4 py-2 rounded-full bg-white border border-slate-200 hover:text-slate-900 flex items-center gap-2 transition-all shadow-sm text-slate-600 text-sm font-medium">
                  <i className="fa-solid fa-arrow-left"></i> Back
                </button>
                
                <div className="flex flex-col lg:flex-row gap-12 bg-white rounded-[32px] p-6 lg:p-12 shadow-xl border border-slate-100">
                  <div className="lg:w-2/3">
                    <div className="rounded-2xl overflow-hidden shadow-sm bg-slate-50">
                      <img src={selectedPrompt.imageUrl} className="w-full h-auto object-contain max-h-[85vh]" alt={selectedPrompt.title} />
                    </div>
                  </div>
                  
                  <div className="lg:w-1/3 space-y-8 flex flex-col">
                    <div>
                       <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{selectedPrompt.author.charAt(0)}</div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900">{selectedPrompt.author}</span>
                            {selectedPrompt.authorUrl && <a href={selectedPrompt.authorUrl} target="_blank" className="text-xs text-slate-500 hover:text-slate-800">View Profile</a>}
                        </div>
                      </div>
                      <h2 className="text-4xl font-bold text-slate-900">{selectedPrompt.title}</h2>
                      <span className="inline-block mt-4 px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-xs font-bold uppercase">{selectedPrompt.category}</span>
                    </div>
                    <div className="space-y-3 flex-grow bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">JSON Prompt</h3>
                        <button onClick={() => { navigator.clipboard.writeText(selectedPrompt.json); alert('Copied!'); }} className="bg-white border border-slate-200 px-2 py-1 rounded text-xs font-bold shadow-sm">Copy</button>
                      </div>
                      <pre className="code-font text-slate-600 text-sm overflow-x-auto whitespace-pre-wrap">{selectedPrompt.json}</pre>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-10 max-w-4xl mx-auto pt-6">
                   <div className="relative group">
                    <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
                    <input type="text" placeholder="Search prompts, styles or inspiration..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200 rounded-full py-4 pl-14 pr-6 text-slate-900 placeholder-slate-400 text-lg shadow-lg focus:ring-2 focus:ring-slate-500/20 outline-none transition-all" />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${selectedCategory === cat ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400'}`}>{cat}</button>
                  ))}
                </div>
                {isLoading ? (
                  <div className="flex justify-center py-20"><i className="fa-solid fa-circle-notch fa-spin text-4xl text-slate-300"></i></div>
                ) : (
                  <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
                    {filteredPrompts.length > 0 ? filteredPrompts.map(prompt => (
                      <div key={prompt.id} className="break-inside-avoid mb-6">
                        <PromptCard prompt={prompt} onSelect={(p) => setSelectedPrompt(p)} />
                      </div>
                    )) : (
                      <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-3xl border border-slate-100 shadow-sm">No prompts found.</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {view === ViewMode.CREATE && <div className="animate-fade-in"><Creator onPostToDirectory={handlePostPrompt} /></div>}
        {view === ViewMode.SUBMIT && <div className="animate-fade-in"><SubmissionForm initialData={prefilledSubmission || {}} onSubmit={handleAddPrompt} onCancel={() => navigateTo(ViewMode.EXPLORE)} /></div>}
      </main>

      <footer className="px-6 py-8 border-t border-slate-200 bg-white/50 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
               dbStatus === 'connected' ? 'bg-emerald-100 text-emerald-700' : 
               dbStatus === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
             }`}>
               <span className={`w-1.5 h-1.5 rounded-full ${
                 dbStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 
                 dbStatus === 'error' ? 'bg-red-500' : 'bg-amber-500'
               }`}></span>
               {dbStatus === 'connected' ? 'Cloud Synced' : dbStatus === 'error' ? 'Sync Error' : 'Local Only'}
             </div>
             <p className="text-xs text-slate-400">© 2024 JSONPrompts.directory - All rights reserved.</p>
          </div>
          <div className="flex items-center gap-6">
             <a href="#" className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">API Docs</a>
             <a href="#" className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">Terms</a>
             <a href="#" className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
