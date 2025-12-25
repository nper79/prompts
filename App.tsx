
import React, { useState, useMemo, useEffect } from 'react';
import { ViewMode, PromptItem } from './types';
import { INITIAL_PROMPTS } from './constants';
import PromptCard from './components/PromptCard';
import Creator from './components/Creator';
import SubmissionForm from './components/SubmissionForm';
import { supabase } from './supabaseClient';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.EXPLORE);
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPrompt, setSelectedPrompt] = useState<PromptItem | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [prefilledSubmission, setPrefilledSubmission] = useState<Partial<PromptItem> | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'local' | 'error'>('local');

  const dynamicTags = useMemo(() => {
    const tags = new Set<string>();
    prompts.forEach(p => p.tags?.forEach(t => tags.add(t)));
    return ['All', ...Array.from(tags).sort()];
  }, [prompts]);

  useEffect(() => {
    const handleRouting = () => {
      let path = window.location.pathname;
      if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
      
      const params = new URLSearchParams(window.location.search);
      const queryData: Partial<PromptItem> = {};
      if (params.get('title')) queryData.title = params.get('title') || '';
      if (params.get('json')) queryData.json = params.get('json') || '';
      if (params.get('imageUrl')) queryData.imageUrl = params.get('imageUrl') || '';
      if (params.get('author')) queryData.author = params.get('author') || '';

      if (path === '/submit') {
        setView(ViewMode.SUBMIT);
        if (Object.keys(queryData).length > 0) setPrefilledSubmission(queryData);
      } else if (path === '/create') {
        setView(ViewMode.CREATE);
      } else {
        setView(ViewMode.EXPLORE);
      }
    };

    handleRouting();
    window.addEventListener('popstate', handleRouting);
    return () => window.removeEventListener('popstate', handleRouting);
  }, []);

  const navigateTo = (newView: ViewMode, data?: Partial<PromptItem>) => {
    let path = '/';
    if (newView === ViewMode.SUBMIT) path = '/submit';
    else if (newView === ViewMode.CREATE) path = '/create';

    window.history.pushState({}, '', path);
    setView(newView);
    if (data) setPrefilledSubmission(data);
    else if (newView !== ViewMode.SUBMIT) setPrefilledSubmission(null);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (newView === ViewMode.EXPLORE) setSelectedPrompt(null);
  };

  useEffect(() => {
    const loadPrompts = async () => {
      setIsLoading(true);
      if (supabase) {
        try {
          const { data, error } = await supabase.from('prompts').select('*').order('created_at', { ascending: false });
          if (error) throw error;
          setDbStatus('connected');
          if (data && data.length > 0) {
            setPrompts(data.map((item: any) => ({
              id: item.id,
              title: item.title,
              tags: item.tags || [],
              json: item.json,
              imageUrl: item.image_url,
              author: item.author,
              authorUrl: item.author_url,
              createdAt: item.created_at
            })));
          } else {
            setPrompts(INITIAL_PROMPTS);
          }
        } catch (err) {
          setDbStatus('error');
          setPrompts(INITIAL_PROMPTS);
        }
      } else {
        setDbStatus('local');
        const saved = localStorage.getItem('jsonprompts_data');
        setPrompts(saved ? JSON.parse(saved) : INITIAL_PROMPTS);
      }
      setIsLoading(false);
    };
    loadPrompts();
  }, []);

  const filteredPrompts = useMemo(() => {
    return prompts.filter(p => {
      const matchesTag = selectedTag === 'All' || p.tags?.includes(selectedTag);
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = p.title.toLowerCase().includes(searchLower) || 
                           p.json.toLowerCase().includes(searchLower) ||
                           p.tags?.some(t => t.toLowerCase().includes(searchLower));
      return matchesTag && matchesSearch;
    });
  }, [prompts, selectedTag, searchQuery]);

  const handlePostPrompt = (imageUrl: string, json: string) => {
    navigateTo(ViewMode.SUBMIT, { imageUrl, json });
  };

  const handleAddPrompt = async (newPromptData: Omit<PromptItem, 'id' | 'createdAt'>) => {
    setIsLoading(true);
    if (supabase) {
      try {
        const { data, error } = await supabase.from('prompts').insert([{
          title: newPromptData.title,
          tags: newPromptData.tags,
          json: newPromptData.json,
          image_url: newPromptData.imageUrl,
          author: newPromptData.author,
          author_url: newPromptData.authorUrl,
        }]).select();
        if (error) throw error;
        if (data) {
          const newP: PromptItem = {
            id: data[0].id,
            title: data[0].title,
            tags: data[0].tags,
            json: data[0].json,
            imageUrl: data[0].image_url,
            author: data[0].author,
            authorUrl: data[0].author_url,
            createdAt: data[0].created_at
          };
          setPrompts(prev => [newP, ...prev]);
        }
      } catch (err) {
        setIsLoading(false);
        return;
      }
    } else {
      const newPrompt: PromptItem = {
        ...newPromptData,
        id: `p-${Date.now()}`,
        createdAt: new Date().toLocaleDateString()
      };
      const updated = [newPrompt, ...prompts];
      setPrompts(updated);
      localStorage.setItem('jsonprompts_data', JSON.stringify(updated));
    }
    navigateTo(ViewMode.EXPLORE);
    setShowSuccessToast(true);
    setIsLoading(false);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {showSuccessToast && (
        <div className="fixed top-24 right-6 z-[100] animate-fade-in">
          <div className="bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-xl flex items-center gap-3">
            <i className="fa-solid fa-check-circle text-xl"></i>
            <p className="font-bold">Published successfully!</p>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {isLightboxOpen && selectedPrompt && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button 
            className="absolute top-6 right-6 text-white text-3xl hover:scale-110 transition-transform"
            onClick={() => setIsLightboxOpen(false)}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
          <img 
            src={selectedPrompt.imageUrl} 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
            alt={selectedPrompt.title}
            onClick={(e) => e.stopPropagation()}
          />
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
             <button onClick={() => navigateTo(ViewMode.CREATE)} className="hidden sm:block text-slate-600 hover:text-slate-900 font-bold text-sm">Create</button>
             <button onClick={() => navigateTo(ViewMode.SUBMIT)} className="bg-brand-gradient text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-lg hover:scale-105 transition-all">Submit</button>
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        {view === ViewMode.EXPLORE && (
          <div className="max-w-[1600px] mx-auto px-6 py-10 animate-fade-in">
            {selectedPrompt ? (
              <div className="max-w-7xl mx-auto">
                <button onClick={() => setSelectedPrompt(null)} className="mb-8 px-4 py-2 rounded-full bg-white border border-slate-200 hover:text-slate-900 flex items-center gap-2 transition-all shadow-sm text-slate-600 text-sm font-medium">
                  <i className="fa-solid fa-arrow-left"></i> Back
                </button>
                <div className="flex flex-col lg:flex-row gap-12 bg-white rounded-[32px] p-6 lg:p-12 shadow-xl border border-slate-100">
                  <div className="lg:w-1/2 flex items-center justify-center bg-slate-50 rounded-2xl overflow-hidden shadow-sm relative group">
                    <img 
                      src={selectedPrompt.imageUrl} 
                      className="w-full h-auto object-contain max-h-[60vh] cursor-zoom-in" 
                      alt={selectedPrompt.title} 
                      onClick={() => setIsLightboxOpen(true)}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none flex items-center justify-center">
                      <i className="fa-solid fa-magnifying-glass-plus text-white text-4xl opacity-0 group-hover:opacity-100 transition-opacity"></i>
                    </div>
                  </div>
                  <div className="lg:w-1/2 space-y-8">
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                         {selectedPrompt.tags.map(t => (
                           <span key={t} className="px-3 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-[10px] font-bold uppercase tracking-wider">#{t}</span>
                         ))}
                      </div>
                      <h2 className="text-4xl font-bold text-slate-900 leading-tight">{selectedPrompt.title}</h2>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">{selectedPrompt.author.charAt(0)}</div>
                        <span className="text-sm font-bold text-slate-600">{selectedPrompt.author}</span>
                      </div>
                    </div>
                    <div className="space-y-3 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">JSON Prompt</h3>
                        <button onClick={() => { navigator.clipboard.writeText(selectedPrompt.json); alert('Copied!'); }} className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-xs font-bold shadow-sm hover:border-slate-400 transition-all">Copy</button>
                      </div>
                      <pre className="code-font text-slate-600 text-sm overflow-x-auto whitespace-pre-wrap">{selectedPrompt.json}</pre>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-10 max-w-4xl mx-auto">
                   <div className="relative group">
                    <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
                    <input type="text" placeholder="Search prompts or tags..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200 rounded-full py-4 pl-14 pr-6 text-slate-900 placeholder-slate-400 text-lg shadow-lg focus:ring-2 focus:ring-slate-500/20 outline-none transition-all" />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
                  {dynamicTags.map(tag => (
                    <button key={tag} onClick={() => setSelectedTag(tag)} className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${selectedTag === tag ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400'}`}>{tag.toUpperCase()}</button>
                  ))}
                </div>
                {isLoading ? (
                  <div className="flex justify-center py-20"><i className="fa-solid fa-circle-notch fa-spin text-4xl text-slate-200"></i></div>
                ) : (
                  <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
                    {filteredPrompts.length > 0 ? filteredPrompts.map(prompt => (
                      <div key={prompt.id} className="break-inside-avoid">
                        <PromptCard prompt={prompt} onSelect={(p) => setSelectedPrompt(p)} />
                      </div>
                    )) : (
                      <div className="col-span-full py-20 text-center text-slate-400">No prompts found in the directory.</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {view === ViewMode.CREATE && <Creator onPostToDirectory={handlePostPrompt} />}
        {view === ViewMode.SUBMIT && <SubmissionForm initialData={prefilledSubmission || {}} onSubmit={handleAddPrompt} onCancel={() => navigateTo(ViewMode.EXPLORE)} />}
      </main>

      <footer className="px-6 py-10 border-t border-slate-200 bg-white/50 backdrop-blur-sm mt-10">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
             <div className="text-slate-900 font-bold text-lg">JSONPrompts.directory</div>
             <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Showcase of complex structured prompts</p>
          </div>
          <div className="flex items-center gap-6">
             <a href="#" className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase">GitHub</a>
             <a href="#" className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase">Docs</a>
             <a href="#" className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
