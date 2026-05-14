// src/components/dashboard/pages/condominios/CondominioSidePanel.tsx

import React, { useState, useEffect, useRef } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { doc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import type { Condominio, CondominioFormData } from '@/types';
import { createCondominio, updateCondominio } from '@/lib/firebase/condominios';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// --- Interfaces, Tipos e Variantes de Animação ---
interface SidePanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (wasCreated?: boolean) => void;
    condominioData: Condominio | null;
}
type FormDataType = {
    nome: string;
    cnpj: string;
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    provincia: string;
};
const overlayVariants = { visible: { opacity: 1 }, hidden: { opacity: 0 }};
const panelVariants = { visible: { x: 0 }, hidden: { x: '100%' }};

// ── NIF Angola ────────────────────────────────────────────────────────────────
//
//  Três formatos válidos:
//  A) Pessoa Colectiva  → 9 dígitos, começa por 5          ex: 500123456
//  B) Pessoa Singular   → 14 chars: 9 dígitos + 2 MAIÚSC + 3 dígitos
//                         ex: 003456789LA042
//  C) Estrangeiro       → 9 dígitos sequenciais (AGT)      ex: 123456789
//
//  A máscara aplica-se em tempo real:
//   - Só aceita dígitos e letras maiúsculas
//   - Limita ao comprimento máximo do formato detectado (14 para singular, 9 para os outros)

type NIFTipo = 'coletiva' | 'singular' | 'estrangeiro' | null;

interface NIFResult {
    valid: boolean;
    tipo: NIFTipo;
    error: string | null;
}

// Detecta o tipo com base no valor actual (parcial ou completo)
function detectTipo(value: string): NIFTipo {
    if (value === '') return null;
    // Se começa por 5 e só tem dígitos → Colectiva
    if (/^5\d*$/.test(value)) return 'coletiva';
    // Se tem letras no meio (posições 9-10) → Singular
    if (/^[0-9]{1,9}[A-Z]{0,2}[0-9]{0,3}$/.test(value) && /[A-Z]/.test(value)) return 'singular';
    // Dígitos que não começam por 5 → Estrangeiro
    if (/^\d+$/.test(value) && !value.startsWith('5')) return 'estrangeiro';
    return null;
}

function formatNIF(raw: string): string {
    // Converte para maiúsculas e remove caracteres inválidos
    const upper = raw.toUpperCase();

    // Detecta o tipo com base no que já foi escrito
    const hasletter = /[A-Z]/.test(upper);

    if (hasletter) {
        // Formato Singular: 9 dígitos + 2 letras + 3 dígitos (max 14)
        // Permite dígitos nas posições 0-8, letras nas 9-10, dígitos nas 11-13
        let result = '';
        let digits1 = 0; // primeiros 9 dígitos
        let letters = 0; // 2 letras
        let digits2 = 0; // últimos 3 dígitos

        for (const ch of upper) {
            if (digits1 < 9 && /\d/.test(ch)) { result += ch; digits1++; }
            else if (digits1 === 9 && letters < 2 && /[A-Z]/.test(ch)) { result += ch; letters++; }
            else if (digits1 === 9 && letters === 2 && digits2 < 3 && /\d/.test(ch)) { result += ch; digits2++; }
        }
        return result;
    } else {
        // Formato Colectiva ou Estrangeiro: só dígitos, max 9
        return upper.replace(/\D/g, '').slice(0, 9);
    }
}

function validateNIF(value: string): NIFResult {
    if (value === '') return { valid: true, tipo: null, error: null };

    const tipo = detectTipo(value);

    // Pessoa Colectiva: 9 dígitos começando por 5
    if (tipo === 'coletiva') {
        if (value.length < 9) return { valid: false, tipo, error: `NIF incompleto — faltam ${9 - value.length} dígito${9 - value.length !== 1 ? 's' : ''}.` };
        return { valid: true, tipo, error: null };
    }

    // Pessoa Singular: 9 dígitos + 2 letras + 3 dígitos = 14 chars
    if (tipo === 'singular') {
        const match = value.match(/^(\d{9})([A-Z]{2})(\d{3})$/);
        if (!match) {
            const len = value.length;
            if (len < 14) return { valid: false, tipo, error: `NIF incompleto — ${14 - len} carácter${14 - len !== 1 ? 'es' : ''} em falta.` };
            return { valid: false, tipo, error: 'Formato inválido. Esperado: 9 dígitos + 2 letras + 3 dígitos (ex: 003456789LA042).' };
        }
        return { valid: true, tipo, error: null };
    }

    // Estrangeiro: 9 dígitos (não começa por 5)
    if (tipo === 'estrangeiro') {
        if (value.length < 9) return { valid: false, tipo, error: `NIF incompleto — faltam ${9 - value.length} dígito${9 - value.length !== 1 ? 's' : ''}.` };
        return { valid: true, tipo, error: null };
    }

    return { valid: false, tipo: null, error: 'Formato de NIF não reconhecido.' };
}

const NIF_TIPO_LABEL: Record<NonNullable<NIFTipo>, string> = {
    coletiva:    'Pessoa Colectiva',
    singular:    'Pessoa Singular',
    estrangeiro: 'Estrangeiro Residente',
};
const NIF_TIPO_PLACEHOLDER: Record<NonNullable<NIFTipo>, string> = {
    coletiva:    '500000000',
    singular:    '000000000LA000',
    estrangeiro: '000000000',
};

// --- Componente Principal ---
const CondominioSidePanel: React.FC<SidePanelProps> = ({ isOpen, onClose, onSuccess, condominioData }) => {
    const { userData } = useAuthContext();
    const initialFormState: FormDataType = { nome: '', cnpj: '', rua: '', numero: '', bairro: '', cidade: '', provincia: '' };
    const [formData, setFormData] = useState<FormDataType>(initialFormState);
    const [isSaving, setIsSaving] = useState(false);
    const [nifResult, setNifResult] = useState<NIFResult>({ valid: true, tipo: null, error: null });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isEditMode = !!condominioData;

    useEffect(() => {
        if (isOpen) {
            if (isEditMode && condominioData) {
                setFormData({
                    nome: condominioData.nome,
                    cnpj: condominioData.cnpj || '',
                    rua: condominioData.endereco.rua,
                    numero: condominioData.endereco.numero,
                    bairro: condominioData.endereco.bairro,
                    cidade: condominioData.endereco.cidade,
                    provincia: condominioData.endereco.provincia,
                });
                setLogoPreview(condominioData.logoUrl || null);
            } else {
                setFormData(initialFormState);
                setLogoPreview(null);
            }
            setLogoFile(null);
        }
    }, [isOpen, isEditMode, condominioData]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNIFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const masked = formatNIF(e.target.value);
        setFormData(prev => ({ ...prev, cnpj: masked }));
        setNifResult(validateNIF(masked));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Valida NIF antes de submeter
        const nifErr = validateNIF(formData.cnpj);
        if (!nifErr.valid) { setNifResult(nifErr); return; }
        setIsSaving(true);
        try {
            let finalLogoUrl: string | undefined = condominioData?.logoUrl ?? undefined;

            if (logoFile) {
                const presignedUrlResponse = await fetch('/api/upload-url', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileName: logoFile.name, fileType: logoFile.type }),
                });

                if (!presignedUrlResponse.ok) throw new Error('Falha ao obter URL de upload.');

                const { uploadUrl, publicUrl } = await presignedUrlResponse.json();

                await fetch(uploadUrl, {
                    method: 'PUT',
                    body: logoFile,
                    headers: { 'Content-Type': logoFile.type },
                });

                finalLogoUrl = publicUrl;
            }
            
            const dataToSubmit: CondominioFormData = {
                nome: formData.nome,
                cnpj: formData.cnpj,
                logoUrl: finalLogoUrl,
                endereco: {
                    rua: formData.rua,
                    numero: formData.numero,
                    bairro: formData.bairro,
                    cidade: formData.cidade,
                    provincia: formData.provincia,
                }
            };
            
            if (isEditMode && condominioData) {
                await updateCondominio(condominioData.id, dataToSubmit);
                toast.success('Condomínio actualizado com sucesso.');
                onSuccess(false);
            } else {
                const actor = userData ? {
                    actorId:   userData.uid,
                    actorNome: userData.nome,
                    actorRole: userData.role,
                } : undefined;
                await createCondominio(dataToSubmit, actor);
                toast.success('Condomínio criado com sucesso.');
                onSuccess(true);
            }
        } catch (error) {
            console.error("Falha ao salvar condomínio:", error);
            toast.error('Erro ao guardar condomínio. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <>
            <motion.div key="overlay" variants={overlayVariants} initial="hidden" animate="visible" exit="hidden" transition={{ duration: 0.3, ease: 'easeInOut' }} className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
            
            <motion.div key="panel" variants={panelVariants} initial="hidden" animate="visible" exit="hidden" transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }} className="fixed top-0 right-0 h-full w-full sm:max-w-md lg:max-w-lg bg-white shadow-2xl z-50">
                <form onSubmit={handleSubmit} className="h-full flex flex-col">
                    <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
                        <h2 className="text-base sm:text-xl font-bold text-gray-800">{isEditMode ? 'Editar Condomínio' : 'Novo Condomínio'}</h2>
                        <button type="button" onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"><X size={20} /></button>
                    </div>

                    <div className="flex-grow p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 scrollbar-thin scrollbar-thumb-zinc-300 scrollbar-track-transparent">
                        
                        <h3 className="text-lg font-semibold text-gray-900">Logo do Condomínio</h3>
                        <div className="flex items-center gap-5">
                            <div className="relative w-24 h-24 rounded-full bg-zinc-100 flex items-center justify-center border-2 border-dashed border-zinc-300">
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Preview do Logo" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <ImageIcon className="w-10 h-10 text-zinc-400" />
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 border border-zinc-300 text-zinc-700 text-sm font-semibold rounded-lg hover:bg-zinc-50 transition-colors">
                                    Carregar imagem
                                </button>
                                <p className="text-xs text-zinc-500">PNG, JPG até 5MB.</p>
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg" className="hidden" />
                        </div>

                        <div className="border-t border-gray-200" />

                        <h3 className="text-lg font-semibold text-gray-900">Informações Gerais</h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="nome" className="block text-sm font-medium text-gray-700">Nome do Condomínio</label>
                                <input type="text" name="nome" id="nome" value={formData.nome} onChange={handleChange} required className="text-black w-full pl-3 pr-3 py-2 mt-1 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white" />
                            </div>
                            <div>
                                <label htmlFor="cnpj" className="block text-sm font-medium text-gray-700">
                                    NIF <span className="text-zinc-400 font-normal">(opcional)</span>
                                </label>

                                {/* Badge de tipo detectado */}
                                {nifResult.tipo && (
                                    <span className={cn(
                                        'inline-block mt-1 mb-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                                        nifResult.tipo === 'coletiva'    && 'bg-blue-50 text-blue-700',
                                        nifResult.tipo === 'singular'    && 'bg-purple-50 text-purple-700',
                                        nifResult.tipo === 'estrangeiro' && 'bg-amber-50 text-amber-700',
                                    )}>
                                        {NIF_TIPO_LABEL[nifResult.tipo]}
                                    </span>
                                )}

                                <div className="relative">
                                    <input
                                        type="text"
                                        name="cnpj"
                                        id="cnpj"
                                        value={formData.cnpj}
                                        onChange={handleNIFChange}
                                        inputMode={nifResult.tipo === 'singular' ? 'text' : 'numeric'}
                                        maxLength={nifResult.tipo === 'singular' ? 14 : 9}
                                        placeholder={
                                            nifResult.tipo
                                                ? NIF_TIPO_PLACEHOLDER[nifResult.tipo]
                                                : '500000000'
                                        }
                                        autoComplete="off"
                                        className={cn(
                                            'text-black w-full pl-3 pr-16 py-2 rounded-lg border text-sm font-mono tracking-widest focus:outline-none focus:ring-2 bg-white transition-colors',
                                            nifResult.error
                                                ? 'border-red-400 focus:ring-red-500/20 focus:border-red-500'
                                                : nifResult.valid && formData.cnpj.length > 0
                                                ? 'border-emerald-400 focus:ring-emerald-500/20 focus:border-emerald-500'
                                                : 'border-zinc-200 focus:ring-orange-500/20 focus:border-orange-500',
                                        )}
                                    />
                                    {/* Contador */}
                                    <span className={cn(
                                        'absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold tabular-nums pointer-events-none',
                                        nifResult.valid && formData.cnpj.length > 0 ? 'text-emerald-500' : 'text-zinc-400',
                                    )}>
                                        {formData.cnpj.length}/{nifResult.tipo === 'singular' ? 14 : 9}
                                    </span>
                                </div>

                                {/* Erro inline */}
                                {nifResult.error && (
                                    <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                                        <span className="inline-flex w-3.5 h-3.5 rounded-full bg-red-500 text-white items-center justify-center text-[9px] font-black shrink-0">!</span>
                                        {nifResult.error}
                                    </p>
                                )}

                                {/* Confirmação válido */}
                                {nifResult.valid && formData.cnpj.length > 0 && (
                                    <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1">
                                        <span className="inline-flex w-3.5 h-3.5 rounded-full bg-emerald-500 text-white items-center justify-center text-[9px] font-black shrink-0">✓</span>
                                        NIF válido
                                    </p>
                                )}

                                {/* Ajuda de formatos */}
                                {!formData.cnpj && (
                                    <p className="mt-1.5 text-[10px] text-zinc-400 leading-relaxed">
                                        Colectiva: 9 dígitos começando por 5 · Singular: 9 dígitos + 2 letras + 3 dígitos · Estrangeiro: 9 dígitos
                                    </p>
                                )}
                            </div>
                        </div>
                        
                        <div className="border-t border-gray-200" />

                        <h3 className="text-lg font-semibold text-gray-900">Endereço</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label htmlFor="rua" className="block text-sm font-medium text-gray-700">Rua</label>
                                <input type="text" name="rua" id="rua" value={formData.rua} onChange={handleChange} required className="text-black w-full pl-3 pr-3 py-2 mt-1 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white" />
                            </div>
                            <div>
                                <label htmlFor="numero" className="block text-sm font-medium text-gray-700">Número</label>
                                <input type="text" name="numero" id="numero" value={formData.numero} onChange={handleChange} className="text-black w-full pl-3 pr-3 py-2 mt-1 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white" />
                            </div>
                            <div>
                                <label htmlFor="bairro" className="block text-sm font-medium text-gray-700">Bairro</label>
                                <input type="text" name="bairro" id="bairro" value={formData.bairro} onChange={handleChange} className="text-black w-full pl-3 pr-3 py-2 mt-1 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white" />
                            </div>
                            <div>
                                <label htmlFor="cidade" className="block text-sm font-medium text-gray-700">Cidade</label>
                                <input type="text" name="cidade" id="cidade" value={formData.cidade} onChange={handleChange} required className="w-full pl-3 pr-3 py-2 mt-1 rounded-lg border border-zinc-200 text-sm focus:outline-none text-black focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white" />
                            </div>
                            <div>
                                <label htmlFor="provincia" className="block text-sm font-medium text-gray-700">Província</label>
                                <input type="text" name="provincia" id="provincia" value={formData.provincia} onChange={handleChange} required className="w-full pl-3 pr-3 py-2 mt-1 rounded-lg border border-zinc-200 text-sm text-black focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white" />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-zinc-200 text-sm font-semibold bg-white hover:bg-zinc-50 transition-colors">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSaving ? 'A guardar...' : 'Guardar Alterações'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </>
    );
};

export default CondominioSidePanel;