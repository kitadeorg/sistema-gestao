// src/components/dashboard/pages/condominios/CondominioSidePanel.tsx

import React, { useState, useEffect, useRef } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { doc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import type { Condominio, CondominioFormData } from '@/types';
import { createCondominio, updateCondominio } from '@/lib/firebase/condominios';
import { cn } from '@/lib/utils';

// --- Interfaces, Tipos e Variantes de Animação ---
interface SidePanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
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

// --- Componente Principal ---
const CondominioSidePanel: React.FC<SidePanelProps> = ({ isOpen, onClose, onSuccess, condominioData }) => {
    const initialFormState: FormDataType = { nome: '', cnpj: '', rua: '', numero: '', bairro: '', cidade: '', provincia: '' };
    const [formData, setFormData] = useState<FormDataType>(initialFormState);
    const [isSaving, setIsSaving] = useState(false);
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

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
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
            } else {
                await createCondominio(dataToSubmit);
            }
            onSuccess();
        } catch (error) {
            console.error("Falha ao salvar condomínio:", error);
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
                                <label htmlFor="cnpj" className="block text-sm font-medium text-gray-700">NIF</label>
                                <input type="text" name="cnpj" id="cnpj" value={formData.cnpj} onChange={handleChange} className="text-black w-full pl-3 pr-3 py-2 mt-1 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white" />
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