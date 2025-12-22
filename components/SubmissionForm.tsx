
import React, { useState, useRef } from 'react';
import { PromptItem } from '../types';
import { CATEGORIES } from '../constants';

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
    category: initialData?.category || CATEGORIES[1],
    json: initialData?.json || '{\n  "style": "cinematic"\n}',
    imageUrl: initialData?.imageUrl || ''
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 1024;
          
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          resolve(dataUrl);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      try {
        const resizedImage = await resizeImage(file);
        setFormData(prev => ({ ...prev, imageUrl: resizedImage }));
      } catch (error) {
        console.error("Error processing image", error);
        alert("Failed to process image.");
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageUrl) { alert('Please upload an image.'); return; }
    if (!formData.title.trim() || !formData.author.trim()) { alert('Title and Author are required.'); return; }
    try { JSON.parse(formData.json); } catch (err) { alert('Invalid JSON.'); return; }
    onSubmit(formData);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
        <h2 className="text-3xl font-bold text-slate-900">Publish Prompt</h2>
        <button onClick={onCancel} className="text-slate-500 hover:text-slate-900 font-medium">Cancel</button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div 
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`aspect-square rounded-3xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-4 relative group ${
              formData.imageUrl ? 'border-slate-300 bg-slate-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'
            }`}
          >
            {formData.imageUrl ? (
              <>
                <img src={formData.imageUrl} className="w-full h-full object-contain p-4" alt="Preview" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-3xl">
                   <p className="text-white font-bold bg-white/20 backdrop-blur-md border border-white/30 px-6 py-2 rounded-full shadow-lg"><i className="fa-solid fa-pen mr-2"></i>Change</p>
                </div>
              </>
            ) : (
              <div className="text-center p-6">
                <i className={`fa-solid ${isProcessing ? 'fa-spinner fa-spin text-slate-600' : 'fa-cloud-arrow-up text-slate-400'} text-4xl mb-4 transition-colors`}></i>
                <p className="font-bold text-slate-700">{isProcessing ? 'Optimizing...' : 'Upload Image'}</p>
                <p className="text-xs text-slate-400 mt-2">JPEG, PNG</p>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange}
              disabled={isProcessing}
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Title</label>
              <input 
                type="text" 
                required
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 text-slate-900 transition-all shadow-sm"
                placeholder="e.g. Neon Void Traveler"
              />
            </div>
            <div>
               <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Category</label>
               <select 
                 value={formData.category}
                 onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                 className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 text-slate-900 shadow-sm"
               >
                 {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
               </select>
            </div>
          </div>
        </div>

        <div className="space-y-6 flex flex-col">
          <div className="flex-grow flex flex-col">
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">JSON Content</label>
            <div className="flex-grow bg-white border border-slate-200 rounded-xl overflow-hidden min-h-[300px] shadow-sm focus-within:ring-2 focus-within:ring-slate-500/20 focus-within:border-slate-500 transition-all">
              <textarea
                required
                value={formData.json}
                onChange={e => setFormData(prev => ({ ...prev, json: e.target.value }))}
                className="w-full h-full p-4 bg-transparent code-font text-slate-700 focus:outline-none resize-none"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Author</label>
                <input 
                  type="text" 
                  required
                  value={formData.author}
                  onChange={e => setFormData(prev => ({ ...prev, author: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 text-slate-900 transition-all shadow-sm"
                  placeholder="Your Name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Social Link</label>
                <input 
                  type="url" 
                  value={formData.authorUrl}
                  onChange={e => setFormData(prev => ({ ...prev, authorUrl: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 text-slate-900 transition-all shadow-sm"
                  placeholder="https://x.com/..."
                />
              </div>
            </div>

          <button 
            type="submit"
            disabled={isProcessing}
            className={`w-full bg-brand-gradient text-white py-4 rounded-full font-bold text-lg hover:shadow-xl hover:shadow-slate-500/25 transition-all active:scale-[0.99] ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isProcessing ? 'Processing Image...' : 'Submit to Directory'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SubmissionForm;
