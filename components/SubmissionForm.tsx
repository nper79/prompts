
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

  // Verificar conexão com o Bucket ao montar o componente
  useEffect(() => {
    const checkBucketConnection = async () => {
      if (!supabase) {
        setBucketStatus('error');
        setBucketErrorMsg('Cliente Supabase não inicializado.');
        return;
      }

      try {
        // Tenta listar ficheiros para ver se temos acesso (mesmo que esteja vazio, não deve dar erro)
        const { error } = await supabase.storage.from('prompts_images').list('', { limit: 1 });
        
        if (error) {
          console.error("Erro de conexão ao bucket:", error);
          setBucketStatus('error');
          if (error.message.includes('row-level security')) {
            setBucketErrorMsg('Erro de Permissões (Policies). O bucket existe mas não tens acesso público.');
          } else if (error.message.includes('bucket not found') || error.statusCode === '404') {
             setBucketErrorMsg("Bucket 'prompts_images' não encontrado no Supabase.");
          } else {
            setBucketErrorMsg(`Erro no Storage: ${error.message}`);
          }
        } else {
          console.log("Conexão ao bucket 'prompts_images' estabelecida com sucesso.");
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
      console.error("Erro na conversão para Blob:", e);
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
      alert('Por favor, adiciona uma imagem antes de submeter.'); 
      return; 
    }

    if (bucketStatus === 'error' && supabase) {
      alert(`Atenção: ${bucketErrorMsg}. O upload vai falhar.`);
      return;
    }
    
    setIsProcessing(true);
    console.log("Iniciando processo de submissão...");

    let finalImageUrl = formData.imageUrl;

    // Se tivermos Supabase e a imagem for um DataURL (gerada agora ou carregada localmente)
    if (supabase && formData.imageUrl.startsWith('data:')) {
      try {
        console.log("Detectado Supabase. A tentar upload para o Storage...");
        
        const fileName = `prompt-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const blob = dataURLtoBlob(formData.imageUrl);

        if (!blob) throw new Error("Falha ao preparar o ficheiro da imagem.");

        // Upload para o Bucket
        const { data, error: uploadError } = await supabase.storage
          .from('prompts_images')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error("Erro detalhado do Supabase Storage:", uploadError);
          throw new Error(`Erro no Storage: ${uploadError.message}`);
        }

        console.log("Upload bem sucedido!", data);

        // Obter URL Público
        const { data: { publicUrl } } = supabase.storage
          .from('prompts_images')
          .getPublicUrl(fileName);
        
        console.log("URL Público gerado:", publicUrl);
        finalImageUrl = publicUrl;
      } catch (err: any) {
        alert(err.message || "Erro desconhecido ao enviar imagem.");
        setIsProcessing(false);
        return;
      }
    } else if (!supabase) {
      console.warn("Supabase não configurado. A usar modo Local (Base64).");
    }

    // Enviar dados finais (com o link do bucket) para a base de dados
    onSubmit({ ...formData, imageUrl: finalImageUrl });
    setIsProcessing(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Finalizar Publicação</h2>
          {supabase && (
            <div className="flex items-center gap-2 mt-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                bucketStatus === 'checking' ? 'bg-yellow-400 animate-pulse' :
                bucketStatus === 'ok' ? 'bg-emerald-500' : 'bg-red-500'
              }`}></span>
              <span className={`text-xs font-bold ${
                bucketStatus === 'error' ? 'text-red-600' : 'text-slate-500'
              }`}>
                {bucketStatus === 'checking' ? 'A verificar Storage...' : 
                 bucketStatus === 'ok' ? 'Storage Conectado: prompts_images' : 
                 bucketErrorMsg}
              </span>
            </div>
          )}
        </div>
        <button onClick={onCancel} className="text-slate-500 hover:text-slate-900 font-medium">Cancelar</button>
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
                <p className="text-sm font-bold">Clica para carregar</p>
              </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>

          <div className="space-y-4">
            <input 
              type="text" placeholder="Título da Obra" required
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
             <input type="text" placeholder="Teu Nome" required value={formData.author} onChange={e => setFormData(p => ({...p, author: e.target.value}))} className="border border-slate-200 rounded-xl px-4 py-3 outline-none shadow-sm" />
             <input type="url" placeholder="Link (X, Portfolio)" value={formData.authorUrl} onChange={e => setFormData(p => ({...p, authorUrl: e.target.value}))} className="border border-slate-200 rounded-xl px-4 py-3 outline-none shadow-sm" />
          </div>

          <button 
            type="submit" 
            disabled={isProcessing || (!!supabase && bucketStatus === 'error')}
            className={`w-full bg-brand-gradient text-white py-4 rounded-full font-bold text-lg hover:shadow-xl transition-all ${isProcessing || (!!supabase && bucketStatus === 'error') ? 'opacity-50 grayscale cursor-not-allowed' : 'active:scale-95'}`}
          >
            {isProcessing ? 'A Enviar para a Cloud...' : 'Submeter para o Diretório'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SubmissionForm;
