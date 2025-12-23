
import React, { useState, useRef, useEffect } from 'react';
import { PromptItem } from '../types';
import { CATEGORIES } from '../constants';
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
    category: initialData?.category || CATEGORIES[1],
    json: initialData?.json || '{\n  "style": "cinematic"\n}',
    imageUrl: initialData?.imageUrl || ''
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [bucketStatus, setBucketStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [bucketErrorMsg, setBucketErrorMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check bucket connection on mount (Silent Check)
  useEffect(() => {
    const checkBucketConnection = async () => {
      if (!supabase) {
        setBucketStatus('error');
        setBucketErrorMsg('Supabase client not initialized.');
        return;
      }

      try {
        // Try to list files to see if we have access
        const { error } = await supabase.storage.from('prompts_images').list('', { limit: 1 });
        
        if (error) {
          console.error("Bucket connection error:", error);
          setBucketStatus('error');
          if (error.message.includes('row-level security')) {
            setBucketErrorMsg('Permission Error (Policies). The bucket exists but public access is denied.');
          } else if (error.message.includes('bucket not found') || error.statusCode === '404') {
             setBucketErrorMsg("Bucket 'prompts_images' not found in Supabase.");
          } else {
            setBucketErrorMsg(`Storage Error: ${error.message}`);
          }
        } else {
          // Connected successfully
          setBucketStatus('ok');
        }
      } catch (err: any) {
        setBucketStatus('error');
        setBucketErrorMsg(err.message);
      }
    };

    checkBucketConnection();
  }, []);

  const dataURLtoBlob = (dataurl: string) => {
    try {
      const arr = dataurl.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch (e) {
      console.error("Blob conversion error:", e);
      return null;
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.imageUrl) { 
      alert('Please add an image before submitting.'); 
      return; 
    }

    if (bucketStatus === 'error' && supabase) {
      // Only alert on submit if there is a critical error
      alert(`Warning: ${bucketErrorMsg}. Upload will fail.`);
      return;
    }
    
    setIsProcessing(true);
    console.log("Starting submission...");

    let finalImageUrl = formData.imageUrl;

    // If Supabase exists and image is a DataURL
    if (supabase && formData.imageUrl.startsWith('data:')) {
      try {
        console.log("Supabase detected. Attempting upload to Storage...");
        
        const fileName = `prompt-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const blob = dataURLtoBlob(formData.imageUrl);

        if (!blob) throw new Error("Failed to prepare image file.");

        // Upload to Bucket
        const { data, error: uploadError } = await supabase.storage
          .from('prompts_images')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error("Supabase Storage Error:", uploadError);
          throw new Error(`Storage Error: ${uploadError.message}`);
        }

        console.log("Upload successful!", data);

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('prompts_images')
          .getPublicUrl(fileName);
        
        console.log("Generated Public URL:", publicUrl);
        finalImageUrl = publicUrl;
      } catch (err: any) {
        alert(err.message || "Unknown error uploading image.");
        setIsProcessing(false);
        return;
      }
    } else if (!supabase) {
      console.warn("Supabase not configured. Using Local Mode (Base64).");
    }

    // Submit final data
    onSubmit({ ...formData, imageUrl: finalImageUrl });
    setIsProcessing(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Finalize Submission</h2>
          {/* Status indicators removed as requested */}
        </div>
        <button onClick={onCancel} className="text-slate-500 hover:text-slate-900 font-medium">Cancel</button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div 
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`aspect-square rounded-3xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-4 relative group ${
              formData.imageUrl ? 'border-slate-300 bg-slate-50' : 'border-slate-200 bg-slate-50'
            }`}
          >
            {formData.imageUrl ? (
              <img src={formData.imageUrl} className="w-full h-full object-contain p-4" alt="Preview" />
            ) : (
              <div className="text-center p-6 text-slate-400">
                <i className="fa-solid fa-image text-4xl mb-2"></i>
                <p className="text-sm font-bold">Click to upload</p>
              </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>

          <div className="space-y-4">
            <input 
              type="text" placeholder="Title of Work" required
              value={formData.title} onChange={e => setFormData(p => ({...p, title: e.target.value}))}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-slate-500/20 outline-none shadow-sm"
            />
            <select 
              value={formData.category} onChange={e => setFormData(p => ({...p, category: e.target.value}))}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 shadow-sm bg-white"
            >
              {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-6">
          <div className="h-[300px] border border-slate-200 rounded-xl overflow-hidden shadow-sm">
             <textarea
               required value={formData.json} onChange={e => setFormData(p => ({...p, json: e.target.value}))}
               className="w-full h-full p-4 code-font text-sm bg-slate-50/50 outline-none resize-none"
               placeholder='{"prompt": "..."}'
             />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <input type="text" placeholder="Your Name" required value={formData.author} onChange={e => setFormData(p => ({...p, author: e.target.value}))} className="border border-slate-200 rounded-xl px-4 py-3 outline-none shadow-sm" />
             <input type="url" placeholder="Social Link (X, Portfolio)" value={formData.authorUrl} onChange={e => setFormData(p => ({...p, authorUrl: e.target.value}))} className="border border-slate-200 rounded-xl px-4 py-3 outline-none shadow-sm" />
          </div>

          <button 
            type="submit" 
            disabled={isProcessing || (!!supabase && bucketStatus === 'error')}
            className={`w-full bg-brand-gradient text-white py-4 rounded-full font-bold text-lg hover:shadow-xl transition-all ${isProcessing || (!!supabase && bucketStatus === 'error') ? 'opacity-50 grayscale cursor-not-allowed' : 'active:scale-95'}`}
          >
            {isProcessing ? 'Uploading to Cloud...' : 'Submit to Directory'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SubmissionForm;
