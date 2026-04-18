// src/services/condominioService.ts
import { Condominio, CondominioFormData } from "@/types";

// Retorna uma promessa que resolve para um array de Condominios
export const getCondominios = async (): Promise<Condominio[]> => {
    console.log("Buscando condomínios...");
    // Aqui virá a lógica do Firestore
    return Promise.resolve([]); 
};

// Recebe os dados do formulário
export const createCondominio = async (data: CondominioFormData): Promise<void> => {
    console.log("Criando condomínio...", data);
    // Aqui virá a lógica do Firestore
    return Promise.resolve();
};

// Recebe o ID e os dados do formulário
export const updateCondominio = async (id: string, data: CondominioFormData): Promise<void> => {
    console.log(`Atualizando condomínio ${id}...`, data);
    // Aqui virá a lógica do Firestore
    return Promise.resolve();
};