/**
 * condominioService.ts
 * Camada de serviço para condomínios — delega para lib/firebase/condominios.ts
 * Mantém a interface pública original para compatibilidade com código existente.
 */

import { Condominio, CondominioFormData } from '@/types';
import {
  getCondominios as _getCondominios,
  getCondominioById as _getCondominioById,
  createCondominio as _createCondominio,
  updateCondominio as _updateCondominio,
  deleteCondominio as _deleteCondominio,
  toggleCondominioStatus as _toggleCondominioStatus,
  updateConfiguracoes as _updateConfiguracoes,
} from '@/lib/firebase/condominios';

// ─────────────────────────────────────────────
// LEITURA
// ─────────────────────────────────────────────

/** Retorna todos os condomínios (sem filtro de utilizador). */
export const getCondominios = async (): Promise<Condominio[]> => {
  return _getCondominios();
};

/** Retorna um condomínio pelo ID. */
export const getCondominioById = async (id: string): Promise<Condominio | null> => {
  return _getCondominioById(id);
};

// ─────────────────────────────────────────────
// ESCRITA
// ─────────────────────────────────────────────

/** Cria um novo condomínio. */
export const createCondominio = async (data: CondominioFormData): Promise<string> => {
  return _createCondominio(data);
};

/** Actualiza os dados de um condomínio existente. */
export const updateCondominio = async (id: string, data: Partial<CondominioFormData>): Promise<void> => {
  return _updateCondominio(id, data);
};

/** Elimina um condomínio pelo ID. */
export const deleteCondominio = async (id: string): Promise<void> => {
  return _deleteCondominio(id);
};

// ─────────────────────────────────────────────
// ESTADO
// ─────────────────────────────────────────────

/** Activa ou desactiva um condomínio. */
export const toggleCondominioStatus = async (
  id: string,
  status: 'active' | 'inactive',
): Promise<void> => {
  return _toggleCondominioStatus(id, status);
};

// ─────────────────────────────────────────────
// CONFIGURAÇÕES
// ─────────────────────────────────────────────

/** Actualiza as configurações financeiras de um condomínio. */
export const updateConfiguracoes = async (
  id: string,
  configuracoes: Partial<Condominio['configuracoes']>,
): Promise<void> => {
  return _updateConfiguracoes(id, configuracoes);
};
