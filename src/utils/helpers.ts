
/**
 * Converte uma chave de role para um label legível.
 * @param role - A chave do role (ex: 'admin', 'gestor').
 * @returns O label formatado (ex: 'Super Administrador').
 */
export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: 'Super Administrador',
    gestor: 'Gestor de Portfólio',
    sindico: 'Síndico',
    funcionario: 'Funcionário',
    morador: 'Morador',
  };
  return labels[role] || 'Perfil Desconhecido';
}