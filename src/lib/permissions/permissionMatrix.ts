/**
 * ============================================================
 * PERMISSION MATRIX
 * Sistema centralizado de autorização por Role + Ação + Recurso
 * ============================================================
 */

export type Role =
  | 'admin'
  | 'gestor'
  | 'sindico'
  | 'funcionario'
  | 'morador';

export type Resource =
  | 'condominio'
  | 'unidade'
  | 'morador'
  | 'pagamento'
  | 'financeiro'
  | 'inadimplencia'
  | 'ocorrencia'
  | 'manutencao'
  | 'documento'
  | 'assembleia'
  | 'votacao'
  | 'usuario'
  | 'audit_log';

export type Action =
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'manage';

/**
 * ============================================================
 * MATRIZ PRINCIPAL
 * ============================================================
 */

const permissionMatrix: Record<Role, Partial<Record<Resource, Action[]>>> = {

  admin: {
    condominio:   ['view', 'create', 'update', 'delete', 'manage'],
    unidade:      ['view', 'create', 'update', 'delete'],
    morador:      ['view', 'create', 'update', 'delete'],
    pagamento:    ['view', 'create', 'update', 'delete', 'approve'],
    financeiro:   ['view', 'manage'],
    inadimplencia:['view', 'create', 'update', 'delete'],
    ocorrencia:   ['view', 'create', 'update', 'delete'],
    manutencao:   ['view', 'create', 'update', 'delete'],
    documento:    ['view', 'create', 'update', 'delete'],
    assembleia:   ['view', 'create', 'update', 'delete'],
    votacao:      ['view', 'create', 'update', 'delete'],
    usuario:      ['view', 'create', 'update', 'delete'],
    audit_log:    ['view']
  },

  gestor: {
    condominio:   ['view', 'create', 'update'],
    unidade:      ['view', 'create', 'update'],
    morador:      ['view', 'create', 'update'],
    pagamento:    ['view', 'create', 'update', 'approve'],
    financeiro:   ['view'],
    inadimplencia:['view', 'create', 'update'],
    ocorrencia:   ['view', 'create', 'update'],
    manutencao:   ['view', 'create', 'update'],
    documento:    ['view', 'create', 'update'],
    assembleia:   ['view', 'create', 'update'],
    votacao:      ['view', 'update'],
    usuario:      ['view', 'create', 'update'],
    audit_log:    ['view']
  },

  sindico: {
    condominio:   ['view', 'update'],
    unidade:      ['view', 'create', 'update'],
    morador:      ['view', 'create', 'update'],
    pagamento:    ['view', 'create', 'update'],
    financeiro:   ['view'],
    inadimplencia:['view', 'create'],
    ocorrencia:   ['view', 'create', 'update'],
    manutencao:   ['view', 'create', 'update'],
    documento:    ['view', 'create', 'update'],
    assembleia:   ['view', 'create', 'update'],
    votacao:      ['view'],
    usuario:      ['view', 'create', 'update']
  },

  funcionario: {
    condominio:   ['view'],
    unidade:      ['view'],
    morador:      ['view'],
    pagamento:    ['view'],
    financeiro:   ['view'],
    ocorrencia:   ['view', 'create', 'update'],  // pode reportar e actualizar
    manutencao:   ['view', 'create', 'update'],  // pode reportar e actualizar
    documento:    ['view'],
    assembleia:   ['view'],
    votacao:      ['view']
  },

  morador: {
    condominio:   ['view'],
    unidade:      ['view'],
    morador:      ['view', 'update'],
    pagamento:    ['view'],
    financeiro:   ['view'],
    ocorrencia:   ['view', 'create'],
    manutencao:   ['view'],
    documento:    ['view'],
    assembleia:   ['view'],
    votacao:      ['view']                        // apenas visualiza, não cria
  }

};

/**
 * ============================================================
 * FUNÇÃO PRINCIPAL
 * ============================================================
 */

export function can(
  role: Role,
  action: Action,
  resource: Resource
): boolean {

  const rolePermissions = permissionMatrix[role];

  if (!rolePermissions) return false;

  const resourcePermissions = rolePermissions[resource];

  if (!resourcePermissions) return false;

  return resourcePermissions.includes(action);
}

/**
 * ============================================================
 * UTILITÁRIOS
 * ============================================================
 */

export function canAny(
  role: Role,
  actions: Action[],
  resource: Resource
): boolean {
  return actions.some(action => can(role, action, resource));
}

export function getPermissionsForRole(role: Role) {
  return permissionMatrix[role] ?? {};
}