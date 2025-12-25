
import React, { useState, useRef, useEffect } from 'react';
import { PromptItem } from '../types';
import { geminiService } from '../services/geminiService';
import { supabase } from '../supabaseClient';

interface SubmissionFormProps {
  initialData?: Partial<PromptItem>;
  onSubmit: (prompt: Omit<PromptItem, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

const SubmissionForm: React.FC<SubmissionFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    author: initialData?.author || '',
    authorUrl: initialData?.authorUrl || '',
    tags: (initialData as any)?.tags || [] as string[],
    json: initialData?.json || '{\n  "subject": "Cyberpunk runner",\n  "lighting": "neon red"\n}',
    imageUrl: initialData?.imageUrl || ''
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isTagging, setIsTagging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const triggerTagging = async () => {
      if (formData.json.length > 20 && formData.tags.length === 0) {
        setIsTagging(true);
        try {
          const tags = await geminiService.generateTags(formData.json);
          setFormData(prev => ({ ...prev, tags }));
        } catch (e) {}
        setIsTagging(false);
      }
    };
    triggerTagging();
  }, []);

  const dataURLtoBlob = (dataurl: string) => {
    try {
      const arr = dataurl.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) u8arr[n] = bstr.charCodeAt(n);
      return new Blob([u8arr], { type: mime });
    } catch (e) { return null; }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, imageUrl: event.target?.result as string }));
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleManualTagGenerate = async () => {
    setIsTagging(true);
    const tags = await geminiService.generateTags(formData.json);
    setFormData(prev => ({ ...prev, tags }));
    setIsTagging(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageUrl) { alert('Please upload an image.'); return; }
    
    setIsProcessing(true);
    let finalImageUrl = formData.imageUrl;

    if (supabase && formData.imageUrl.startsWith('data:')) {
      try {
        const fileName = `prompt-${Date.now()}.jpg`;
        const blob = dataURLtoBlob(formData.imageUrl);
        if (blob) {
          const { error } = await supabase.storage.from('prompts_images').upload(fileName, blob);
          if (!error) {
            const { data: { publicUrl } } = supabase.storage.from('prompts_images').getPublicUrl(fileName);
            finalImageUrl = publicUrl;
          }
        }
      } catch (err) {}
    }

    onSubmit({ ...formData, imageUrl: finalImageUrl });
    setIsProcessing(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 animate-fade-in">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Publish to Directory</h2>
          <p className="text-slate-500 mt-1">Share your structured prompt with the community.</p>
        </div>
        <button onClick={onCancel} className="text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors">Discard</button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5 space-y-6">
          <div 
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className="aspect-square rounded-[32px] border-2 border-dashed border-slate-200 bg-white cursor-pointer overflow-hidden flex flex-col items-center justify-center hover:border-slate-400 hover:bg-slate-50 transition-all group relative"
          >
            {formData.imageUrl ? (
              <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Preview" />
            ) : (
              <div className="text-center p-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-300">
                  <i className="fa-solid fa-cloud-arrow-up text-2xl"></i>
                </div>
                <p className="text-sm font-bold text-slate-400">Upload Final Image</p>
              </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>

          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
             <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">AI Meta-Tags</span>
                <button type="button" onClick={handleManualTagGenerate} disabled={isTagging} className="text-[10px] font-bold text-slate-500 hover:text-slate-900 transition-colors underline">Refresh</button>
             </div>
             <div className="flex flex-wrap gap-2">
               {isTagging ? (
                 <span className="text-xs font-medium animate-pulse text-slate-400">Gemini is tagging...</span>
               ) : formData.tags.length > 0 ? (
                 formData.tags.map(tag => (
                   <span key={tag} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold rounded-lg uppercase">#{tag}</span>
                 ))
               ) : (
                 <span className="text-xs text-slate-300 italic">Tags will appear automatically</span>
               )}
             </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Title</label>
              <input 
                type="text" placeholder="Creative Subject Name" required
                value={formData.title} onChange={e => setFormData(p => ({...p, title: e.target.value}))}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Creator</label>
              <input 
                type="text" placeholder="Your handle" required
                value={formData.author} onChange={e => setFormData(p => ({...p, author: e.target.value}))}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Structured JSON Data</label>
            <textarea
              required
              value={formData.json}
              onChange={e => setFormData(p => ({...p, json: e.target.value}))}
              className="w-full h-64 border border-slate-200 rounded-2xl p-6 code-font text-sm outline-none bg-white focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400 transition-all resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full bg-brand-gradient text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-slate-500/20 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Publish Prompt'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SubmissionForm;
