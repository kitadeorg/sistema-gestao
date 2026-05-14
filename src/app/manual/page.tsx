'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Building2, BarChart3, Users, Bell, Wrench, Shield,
  FileText, Settings, ChevronRight, Menu, X, Search,
  Home, CreditCard, MessageSquare, Vote, FolderOpen,
  UserCog, ChevronDown, Circle, ArrowLeft,
} from 'lucide-react';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface Section {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  subsections: { id: string; title: string }[];
}

// ─────────────────────────────────────────────
// SIDEBAR STRUCTURE
// ─────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    id: 'introducao',
    title: 'Introdução',
    icon: Home,
    color: 'text-zinc-500',
    subsections: [
      { id: 'o-que-e', title: 'O que é o CONDO.' },
      { id: 'perfis', title: 'Perfis de utilizador' },
      { id: 'primeiros-passos', title: 'Primeiros passos' },
    ],
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    icon: CreditCard,
    color: 'text-blue-500',
    subsections: [
      { id: 'quotas', title: 'Quotas mensais' },
      { id: 'despesas', title: 'Despesas' },
      { id: 'fluxo-caixa', title: 'Fluxo de caixa' },
      { id: 'inadimplencia', title: 'Inadimplência' },
    ],
  },
  {
    id: 'moradores',
    title: 'Moradores',
    icon: Users,
    color: 'text-emerald-500',
    subsections: [
      { id: 'gerir-moradores', title: 'Gerir moradores' },
      { id: 'historico', title: 'Histórico de residência' },
    ],
  },
  {
    id: 'unidades',
    title: 'Unidades',
    icon: Building2,
    color: 'text-orange-500',
    subsections: [
      { id: 'tipos-unidade', title: 'Tipos de unidade' },
      { id: 'quota-individual', title: 'Quota individual' },
    ],
  },
  {
    id: 'ocorrencias',
    title: 'Ocorrências',
    icon: Bell,
    color: 'text-amber-500',
    subsections: [
      { id: 'criar-ocorrencia', title: 'Criar uma ocorrência' },
      { id: 'fluxo-estados', title: 'Fluxo de estados' },
      { id: 'comentarios', title: 'Comentários e anexos' },
    ],
  },
  {
    id: 'manutencao',
    title: 'Manutenção',
    icon: Wrench,
    color: 'text-purple-500',
    subsections: [
      { id: 'tarefas', title: 'Tarefas' },
      { id: 'agenda', title: 'Agenda' },
      { id: 'fornecedores', title: 'Fornecedores' },
    ],
  },
  {
    id: 'comunicacao',
    title: 'Comunicação',
    icon: MessageSquare,
    color: 'text-rose-500',
    subsections: [
      { id: 'avisos', title: 'Avisos e comunicados' },
    ],
  },
  {
    id: 'assembleias',
    title: 'Assembleias',
    icon: Vote,
    color: 'text-indigo-500',
    subsections: [
      { id: 'criar-assembleia', title: 'Criar assembleia' },
      { id: 'votacao', title: 'Votações' },
    ],
  },
  {
    id: 'documentos',
    title: 'Documentos',
    icon: FolderOpen,
    color: 'text-teal-500',
    subsections: [
      { id: 'carregar-doc', title: 'Carregar documentos' },
    ],
  },
  {
    id: 'equipa',
    title: 'Equipa',
    icon: UserCog,
    color: 'text-cyan-500',
    subsections: [
      { id: 'funcionarios', title: 'Funcionários' },
      { id: 'visitantes', title: 'Visitantes' },
    ],
  },
  {
    id: 'configuracoes',
    title: 'Configurações',
    icon: Settings,
    color: 'text-zinc-500',
    subsections: [
      { id: 'condominio', title: 'Dados do condomínio' },
      { id: 'financeiras', title: 'Configurações financeiras' },
    ],
  },
];

// ─────────────────────────────────────────────
// CONTENT DATA
// ─────────────────────────────────────────────

interface ContentBlock {
  type: 'h1' | 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'tip' | 'warning' | 'table' | 'badge-list';
  content?: string;
  items?: string[];
  headers?: string[];
  rows?: string[][];
  badges?: { label: string; color: string }[];
}

const CONTENT: Record<string, ContentBlock[]> = {
  'o-que-e': [
    { type: 'h1', content: 'O que é o CONDO.' },
    { type: 'p', content: 'O CONDO. é uma plataforma de gestão de condomínios pensada para empresas gestoras, síndicos, funcionários e moradores. O objectivo é centralizar toda a informação num único lugar — desde as finanças às ocorrências, passando pela comunicação e documentos.' },
    { type: 'p', content: 'Com o CONDO. consegues gerir vários condomínios ao mesmo tempo, alternar entre eles com um clique, e ter sempre uma visão clara do estado de cada um.' },
    { type: 'h2', content: 'Para quem é?' },
    { type: 'ul', items: [
      'Empresas gestoras que administram múltiplos condomínios',
      'Gestores de portfólio que supervisionam vários edifícios',
      'Síndicos responsáveis por um condomínio específico',
      'Funcionários como porteiros, técnicos e auxiliares',
      'Moradores que querem acompanhar as suas quotas e reportar problemas',
    ]},
    { type: 'tip', content: 'Cada perfil vê apenas as funcionalidades que lhe dizem respeito. Um morador não tem acesso às finanças globais, e um funcionário não consegue aprovar pagamentos.' },
  ],
  'perfis': [
    { type: 'h1', content: 'Perfis de utilizador' },
    { type: 'p', content: 'O CONDO. tem 6 perfis diferentes, cada um com permissões específicas. Ao criares um utilizador, escolhes o perfil adequado à sua função.' },
    { type: 'table', headers: ['Perfil', 'Quem é', 'O que pode fazer'], rows: [
      ['Super Admin', 'Dono da plataforma', 'Acesso total. Gere outros administradores e vê todos os registos de auditoria.'],
      ['Admin', 'Responsável da empresa gestora', 'Gere tudo excepto criar outros super admins. Vê registos de auditoria.'],
      ['Gestor', 'Gestor de portfólio', 'Gere vários condomínios. Pode criar e editar, aprovar pagamentos, mas não eliminar condomínios.'],
      ['Síndico', 'Responsável de um condomínio', 'Gere um único condomínio. Cria e edita, mas não aprova pagamentos nem elimina condomínios.'],
      ['Funcionário', 'Porteiro, técnico, auxiliar', 'Acesso operacional: cria ocorrências e tarefas. Só visualiza finanças e documentos.'],
      ['Morador', 'Residente', 'Vê o seu apartamento, as suas quotas, vota em assembleias e cria ocorrências.'],
    ]},
    { type: 'tip', content: 'Quando adicionas um novo utilizador, o sistema envia um convite por email. No primeiro acesso, a pessoa define a sua senha pessoal.' },
  ],
  'primeiros-passos': [
    { type: 'h1', content: 'Primeiros passos' },
    { type: 'p', content: 'Depois de criares a tua conta, seguem estes 4 passos para teres o teu condomínio a funcionar.' },
    { type: 'ol', items: [
      'Cria o condomínio — vai a Configurações e preenche os dados básicos: nome, morada e contactos.',
      'Adiciona as unidades — regista cada apartamento, loja ou escritório com o seu tipo e área.',
      'Regista os moradores — associa cada morador à respectiva unidade. O sistema cria automaticamente o convite de acesso.',
      'Configura as quotas — define o valor mensal padrão, o dia de vencimento, a multa por atraso e os juros mensais.',
    ]},
    { type: 'warning', content: 'As quotas só são geradas automaticamente para unidades que estejam marcadas como ocupadas. Confirma o estado de cada unidade antes de gerar as quotas do mês.' },
  ],
  'quotas': [
    { type: 'h1', content: 'Quotas mensais' },
    { type: 'p', content: 'As quotas são os pagamentos mensais que cada morador deve fazer. O sistema gera-as automaticamente para todas as unidades ocupadas no início de cada mês.' },
    { type: 'h2', content: 'Como funciona a geração automática' },
    { type: 'p', content: 'O sistema usa o valor padrão definido nas configurações do condomínio. Se uma unidade tiver uma quota individual activada, usa esse valor em vez do padrão.' },
    { type: 'h2', content: 'Estados de uma quota' },
    { type: 'badge-list', badges: [
      { label: 'Pendente', color: 'bg-zinc-100 text-zinc-700' },
      { label: 'Pago', color: 'bg-emerald-100 text-emerald-700' },
      { label: 'Atrasado', color: 'bg-red-100 text-red-700' },
      { label: 'Isento', color: 'bg-blue-100 text-blue-700' },
    ]},
    { type: 'h2', content: 'Registar um pagamento' },
    { type: 'ol', items: [
      'Abre o módulo Financeiro e selecciona a tab Quotas.',
      'Encontra a quota que queres liquidar e clica em "Registar pagamento".',
      'Indica o valor pago e carrega o comprovativo (opcional).',
      'O sistema actualiza o estado para Pago automaticamente.',
    ]},
    { type: 'h2', content: 'Pagamento parcial' },
    { type: 'p', content: 'Se o morador pagar apenas uma parte, o sistema regista o valor recebido e calcula automaticamente o saldo em falta. Podes registar vários pagamentos parciais até a quota ficar completamente liquidada.' },
    { type: 'h2', content: 'Multas e juros' },
    { type: 'p', content: 'Quando uma quota passa da data de vencimento sem ser paga, o sistema aplica uma multa única (percentagem definida nas configurações) e acumula juros mensais por cada mês em atraso.' },
    { type: 'tip', content: 'Podes isentar uma quota de pagamento se houver um motivo justificado. A isenção fica registada com o motivo indicado.' },
  ],
  'despesas': [
    { type: 'h1', content: 'Despesas' },
    { type: 'p', content: 'As despesas registam todos os custos operacionais do condomínio: limpeza, manutenção, electricidade, água, etc.' },
    { type: 'h2', content: 'Categorias disponíveis' },
    { type: 'ul', items: [
      'Manutenção — reparações e trabalhos técnicos',
      'Limpeza — serviços de limpeza e higiene',
      'Segurança — vigilância e sistemas de segurança',
      'Energia — electricidade e combustível',
      'Água — consumo de água',
      'Administrativo — papelaria, contabilidade, etc.',
      'Obras — remodelações e obras de grande envergadura',
      'Seguros — apólices de seguro do condomínio',
      'Outros — tudo o resto',
    ]},
    { type: 'h2', content: 'Como registar uma despesa' },
    { type: 'ol', items: [
      'Vai ao módulo Financeiro e selecciona Despesas.',
      'Clica em "Nova despesa".',
      'Preenche a descrição, o valor, a categoria e a data.',
      'Adiciona o nome do fornecedor e carrega o comprovativo se tiveres.',
      'Guarda. A despesa fica imediatamente reflectida no fluxo de caixa.',
    ]},
  ],
  'fluxo-caixa': [
    { type: 'h1', content: 'Fluxo de caixa' },
    { type: 'p', content: 'O fluxo de caixa dá-te uma visão consolidada das entradas e saídas de dinheiro num determinado período. Podes filtrar por 1 mês, 3 meses, 6 meses ou 1 ano.' },
    { type: 'h2', content: 'O que vês no fluxo de caixa' },
    { type: 'ul', items: [
      'Receita Total — soma de todas as quotas pagas no período',
      'Despesas Totais — soma de todas as despesas no período',
      'Margem Líquida — diferença entre receita e despesas (em Kz e em percentagem)',
    ]},
    { type: 'p', content: 'Se fizeres gestão de portfólio, vês um breakdown por cada condomínio com uma barra de performance visual — verde quando a margem é saudável, amarelo quando é baixa, vermelho quando está negativa.' },
    { type: 'warning', content: 'Uma margem líquida negativa significa que as despesas estão a superar as receitas. Nesse caso, convém rever os custos ou ajustar o valor das quotas.' },
  ],
  'inadimplencia': [
    { type: 'h1', content: 'Inadimplência' },
    { type: 'p', content: 'A vista de inadimplência mostra todas as quotas em atraso ou pendentes cuja data de vencimento já passou. Serve para teres uma visão rápida de quem deve e há quanto tempo.' },
    { type: 'h2', content: 'Notificações automáticas' },
    { type: 'p', content: 'O sistema envia lembretes automáticos por WhatsApp, SMS ou email em três momentos:' },
    { type: 'ul', items: [
      'Antes do vencimento — lembrete preventivo',
      '3 dias antes do vencimento — lembrete de urgência',
      '7 dias após o vencimento — notificação de atraso',
    ]},
    { type: 'tip', content: 'A taxa de inadimplência é calculada automaticamente e aparece nos dashboards. Se ultrapassar 10%, o sistema assinala como Elevada; acima de 20%, é considerada Crítica.' },
  ],
  'gerir-moradores': [
    { type: 'h1', content: 'Gerir moradores' },
    { type: 'p', content: 'O módulo de moradores permite registar todos os residentes do condomínio e associá-los às respectivas unidades.' },
    { type: 'h2', content: 'Adicionar um morador' },
    { type: 'ol', items: [
      'Vai ao módulo Moradores e clica em "Novo morador".',
      'Preenche o nome completo, email, telefone e tipo (proprietário ou inquilino).',
      'Selecciona a unidade onde vive.',
      'Guarda. O sistema envia automaticamente um convite por email para o morador criar a sua conta.',
    ]},
    { type: 'p', content: 'Ao adicionar um morador, a unidade passa automaticamente para o estado "Ocupada" e as quotas mensais começam a ser geradas.' },
    { type: 'h2', content: 'Estados do morador' },
    { type: 'badge-list', badges: [
      { label: 'Activo', color: 'bg-emerald-100 text-emerald-700' },
      { label: 'Inadimplente', color: 'bg-red-100 text-red-700' },
      { label: 'Ausente', color: 'bg-amber-100 text-amber-700' },
      { label: 'Inactivo', color: 'bg-zinc-100 text-zinc-700' },
    ]},
    { type: 'h2', content: 'Remover um morador' },
    { type: 'p', content: 'Ao remover um morador, o sistema guarda automaticamente o histórico de residência (nome, período, unidade) antes de o apagar. Se não houver mais moradores na unidade, ela volta ao estado "Vaga".' },
  ],
  'historico': [
    { type: 'h1', content: 'Histórico de residência' },
    { type: 'p', content: 'O CONDO. guarda um registo completo de todos os moradores que já passaram por cada unidade. Podes consultar quando entrou, quando saiu e quem registou a saída.' },
    { type: 'tip', content: 'O histórico é automático — não precisas de fazer nada. Sempre que removes um morador, o sistema regista os dados e a data de saída.' },
  ],
  'tipos-unidade': [
    { type: 'h1', content: 'Tipos de unidade' },
    { type: 'p', content: 'Cada condomínio pode ter diferentes tipos de unidades. Ao criar uma unidade, seleccionas o tipo adequado:' },
    { type: 'ul', items: ['T0', 'T1', 'T2', 'T3', 'T4', 'Vivenda', 'Loja', 'Escritório'] },
    { type: 'h2', content: 'Informações da unidade' },
    { type: 'ul', items: [
      'Número — identificador único (ex: A8, 3B)',
      'Bloco — bloco ou torre a que pertence (opcional)',
      'Área — em m²',
      'Fracção e permilagem — para cálculos proporcionais',
      'Estado — Ocupada, Vaga ou Em reforma',
    ]},
    { type: 'h2', content: 'Estados de uma unidade' },
    { type: 'badge-list', badges: [
      { label: 'Ocupada', color: 'bg-emerald-100 text-emerald-700' },
      { label: 'Vaga', color: 'bg-zinc-100 text-zinc-700' },
      { label: 'Em reforma', color: 'bg-amber-100 text-amber-700' },
    ]},
  ],
  'quota-individual': [
    { type: 'h1', content: 'Quota individual' },
    { type: 'p', content: 'Por norma, todas as unidades pagam o mesmo valor de quota mensal — o valor padrão definido nas configurações do condomínio. No entanto, podes definir um valor diferente para uma unidade específica.' },
    { type: 'h2', content: 'Como activar' },
    { type: 'ol', items: [
      'Abre a unidade que queres configurar.',
      'Activa a opção "Quota individual".',
      'Define o valor mensal específico para essa unidade.',
      'Guarda. A partir do próximo mês, as quotas dessa unidade serão geradas com esse valor.',
    ]},
    { type: 'tip', content: 'Útil para unidades maiores, lojas ou escritórios que contribuem com um valor diferente para o condomínio.' },
  ],
  'criar-ocorrencia': [
    { type: 'h1', content: 'Criar uma ocorrência' },
    { type: 'p', content: 'Uma ocorrência é qualquer problema ou situação que precise de atenção no condomínio — barulho, avaria de água, questões de segurança, limpeza, etc.' },
    { type: 'h2', content: 'Quem pode criar ocorrências' },
    { type: 'ul', items: [
      'Moradores — para reportar problemas que afectam o seu dia-a-dia',
      'Síndicos — para registar situações identificadas',
      'Funcionários — para registar problemas operacionais',
    ]},
    { type: 'h2', content: 'Como criar' },
    { type: 'ol', items: [
      'Vai ao módulo Ocorrências e clica em "Nova ocorrência".',
      'Escreve uma descrição detalhada do problema.',
      'Escolhe a categoria: barulho, água, segurança, limpeza, manutenção ou outro.',
      'Define a prioridade: baixa, média ou alta.',
      'Submete. A ocorrência fica no estado Aberta.',
    ]},
  ],
  'fluxo-estados': [
    { type: 'h1', content: 'Fluxo de estados de uma ocorrência' },
    { type: 'p', content: 'Cada ocorrência passa por um conjunto de estados desde que é criada até ser resolvida.' },
    { type: 'table', headers: ['Estado', 'Quem age', 'O que acontece'], rows: [
      ['Aberta', 'Qualquer utilizador', 'A ocorrência foi criada e está à espera de atenção.'],
      ['Delegada', 'Síndico', 'O síndico atribuiu a ocorrência a um funcionário com prioridade e instruções.'],
      ['Em execução', 'Funcionário', 'O funcionário iniciou o trabalho de resolução.'],
      ['Concluída', 'Funcionário', 'O funcionário marcou o trabalho como feito.'],
      ['Encerrada', 'Síndico', 'O síndico confirmou a resolução e encerrou formalmente.'],
    ]},
    { type: 'tip', content: 'O síndico pode delegar directamente para um funcionário, incluindo instruções específicas sobre como resolver o problema.' },
  ],
  'comentarios': [
    { type: 'h1', content: 'Comentários e anexos' },
    { type: 'p', content: 'Qualquer utilizador com acesso à ocorrência pode adicionar comentários para manter um registo da comunicação e do progresso.' },
    { type: 'ul', items: [
      'Os comentários mostram o nome e o perfil de quem escreveu',
      'Podes anexar ficheiros: fotos, documentos, relatórios',
      'O sistema guarda a data e hora de cada comentário',
      'A ocorrência é actualizada automaticamente com o último comentário',
    ]},
  ],
  'tarefas': [
    { type: 'h1', content: 'Tarefas de manutenção' },
    { type: 'p', content: 'As tarefas são trabalhos de manutenção agendados ou pontuais: inspecções, reparações, limpezas programadas, etc.' },
    { type: 'h2', content: 'Estados de uma tarefa' },
    { type: 'badge-list', badges: [
      { label: 'Pendente', color: 'bg-zinc-100 text-zinc-700' },
      { label: 'Em execução', color: 'bg-blue-100 text-blue-700' },
      { label: 'Concluída', color: 'bg-emerald-100 text-emerald-700' },
      { label: 'Atrasada', color: 'bg-red-100 text-red-700' },
    ]},
    { type: 'p', content: 'Uma tarefa fica marcada como Atrasada quando a data agendada passou e ainda não foi concluída.' },
    { type: 'h2', content: 'Criar uma tarefa' },
    { type: 'ol', items: [
      'Vai a Manutenção e selecciona a tab Tarefas.',
      'Clica em "Nova tarefa".',
      'Preenche o título, descrição, prioridade e data agendada.',
      'Associa um fornecedor se necessário.',
      'Usa os botões "Iniciar" e "Concluir" para avançar no fluxo.',
    ]},
  ],
  'agenda': [
    { type: 'h1', content: 'Agenda de manutenção' },
    { type: 'p', content: 'A agenda mostra todas as tarefas que têm data agendada e ainda não foram concluídas, ordenadas pela data mais próxima. É a forma mais rápida de ver o que está por fazer.' },
    { type: 'tip', content: 'Usa a agenda para planear a semana e garantir que nenhuma manutenção fica esquecida.' },
  ],
  'fornecedores': [
    { type: 'h1', content: 'Fornecedores' },
    { type: 'p', content: 'O módulo de fornecedores guarda os contactos das empresas e técnicos que prestas serviços ao condomínio.' },
    { type: 'h2', content: 'Especialidades disponíveis' },
    { type: 'ul', items: ['Electricidade', 'Canalização', 'Pintura', 'Carpintaria', 'Elevadores', 'Jardim', 'Limpeza', 'Segurança', 'Outro'] },
    { type: 'p', content: 'Cada fornecedor mostra quantas tarefas activas tem neste momento, para saberes quem está mais ocupado.' },
  ],
  'avisos': [
    { type: 'h1', content: 'Avisos e comunicados' },
    { type: 'p', content: 'O módulo de comunicação permite publicar avisos para todos os moradores e funcionários do condomínio.' },
    { type: 'h2', content: 'Tipos de aviso' },
    { type: 'badge-list', badges: [
      { label: 'Geral', color: 'bg-zinc-100 text-zinc-700' },
      { label: 'Financeiro', color: 'bg-blue-100 text-blue-700' },
      { label: 'Manutenção', color: 'bg-purple-100 text-purple-700' },
      { label: 'Segurança', color: 'bg-red-100 text-red-700' },
      { label: 'Evento', color: 'bg-emerald-100 text-emerald-700' },
      { label: 'Urgente', color: 'bg-orange-100 text-orange-700' },
    ]},
    { type: 'h2', content: 'Canais de envio' },
    { type: 'p', content: 'Ao publicar um aviso, podes escolher os canais de envio: email, WhatsApp ou SMS. O aviso fica sempre visível na plataforma, independentemente dos canais escolhidos.' },
    { type: 'h2', content: 'Avisos fixados' },
    { type: 'p', content: 'Podes fixar um aviso importante para que apareça sempre no topo da lista, mesmo que existam avisos mais recentes.' },
  ],
  'criar-assembleia': [
    { type: 'h1', content: 'Criar uma assembleia' },
    { type: 'p', content: 'As assembleias permitem organizar reuniões com os moradores, gerir a ordem de trabalhos e registar as decisões tomadas.' },
    { type: 'ol', items: [
      'Vai ao módulo Assembleias e clica em "Nova assembleia".',
      'Preenche o título, descrição, data e local.',
      'Adiciona os pontos da ordem de trabalhos (pauta).',
      'Carrega a convocatória em PDF se quiseres partilhá-la.',
      'Guarda. A assembleia fica no estado Agendada.',
    ]},
    { type: 'h2', content: 'Estados de uma assembleia' },
    { type: 'badge-list', badges: [
      { label: 'Agendada', color: 'bg-zinc-100 text-zinc-700' },
      { label: 'Em curso', color: 'bg-blue-100 text-blue-700' },
      { label: 'Encerrada', color: 'bg-emerald-100 text-emerald-700' },
      { label: 'Cancelada', color: 'bg-red-100 text-red-700' },
    ]},
  ],
  'votacao': [
    { type: 'h1', content: 'Votações em assembleia' },
    { type: 'p', content: 'Durante uma assembleia em curso, o síndico pode activar a votação para pontos específicos da pauta. Os moradores votam directamente pela plataforma.' },
    { type: 'h2', content: 'Como funciona' },
    { type: 'ol', items: [
      'Muda o estado da assembleia para "Em curso".',
      'Activa a votação no ponto da pauta pretendido.',
      'Os moradores votam: Sim, Não ou Abstenção.',
      'Cada morador só pode votar uma vez por ponto.',
      'Fecha a votação e regista o resultado.',
      'Repete para os restantes pontos da pauta.',
      'Encerra a assembleia quando terminar.',
    ]},
    { type: 'tip', content: 'Depois da assembleia, podes carregar a ata em PDF para ficar arquivada no sistema.' },
  ],
  'carregar-doc': [
    { type: 'h1', content: 'Carregar documentos' },
    { type: 'p', content: 'O módulo de documentos serve como repositório central de todos os ficheiros importantes do condomínio: regulamentos, atas, contratos, documentos financeiros, etc.' },
    { type: 'h2', content: 'Categorias de documentos' },
    { type: 'ul', items: ['Regulamento', 'Ata', 'Contrato', 'Financeiro', 'Jurídico', 'Outro'] },
    { type: 'h2', content: 'Como carregar um documento' },
    { type: 'ol', items: [
      'Vai ao módulo Documentos.',
      'Clica em "Carregar documento".',
      'Preenche o título e descrição.',
      'Escolhe a categoria.',
      'Selecciona o ficheiro e confirma.',
    ]},
    { type: 'p', content: 'Os documentos aparecem ordenados do mais recente para o mais antigo. Todos os utilizadores com acesso ao condomínio podem consultar os documentos.' },
  ],
  'funcionarios': [
    { type: 'h1', content: 'Funcionários' },
    { type: 'p', content: 'O módulo de equipa permite gerir todos os funcionários do condomínio: porteiros, técnicos, auxiliares, etc.' },
    { type: 'h2', content: 'Adicionar um funcionário' },
    { type: 'ol', items: [
      'Vai ao módulo Equipa.',
      'Clica em "Novo funcionário".',
      'Preenche o nome, email, telefone e cargo.',
      'O sistema envia automaticamente um email de convite.',
      'O funcionário define a sua senha no primeiro acesso.',
    ]},
    { type: 'h2', content: 'Cargos disponíveis' },
    { type: 'ul', items: ['Porteiro', 'Segurança', 'Zelador', 'Auxiliar de Limpeza', 'Técnico de Manutenção', 'Administrativo', 'Gestor de Condomínio', 'Outro'] },
    { type: 'h2', content: 'Estados do funcionário' },
    { type: 'badge-list', badges: [
      { label: 'Activo', color: 'bg-emerald-100 text-emerald-700' },
      { label: 'Pendente', color: 'bg-amber-100 text-amber-700' },
      { label: 'Inactivo', color: 'bg-zinc-100 text-zinc-700' },
    ]},
    { type: 'tip', content: 'Um funcionário fica "Pendente" enquanto não aceitar o convite e criar a sua conta.' },
  ],
  'visitantes': [
    { type: 'h1', content: 'Controlo de visitantes' },
    { type: 'p', content: 'O módulo de visitantes é gerido pelos porteiros e permite registar todas as entradas e saídas do condomínio.' },
    { type: 'h2', content: 'Registar uma entrada' },
    { type: 'ol', items: [
      'Vai ao módulo Visitantes.',
      'Clica em "Novo visitante".',
      'Preenche o nome, número de documento, unidade de destino e motivo da visita.',
      'Confirma a entrada. O visitante fica no estado "Dentro".',
    ]},
    { type: 'h2', content: 'Registar uma saída' },
    { type: 'p', content: 'Quando o visitante sai, encontra o registo na lista e clica em "Registar saída". O sistema regista automaticamente a hora de saída.' },
    { type: 'p', content: 'No topo da página vês sempre quantos visitantes estão actualmente dentro do condomínio.' },
  ],
  'condominio': [
    { type: 'h1', content: 'Dados do condomínio' },
    { type: 'p', content: 'Nas configurações do condomínio podes actualizar os dados gerais, morada e contactos.' },
    { type: 'ul', items: [
      'Nome do condomínio',
      'Estado (Activo / Inactivo)',
      'Morada completa: rua, número, bairro, cidade, província',
      'Email e telefone de contacto',
    ]},
    { type: 'warning', content: 'Colocar um condomínio como "Inactivo" não apaga os dados, mas impede que novas operações sejam registadas.' },
  ],
  'financeiras': [
    { type: 'h1', content: 'Configurações financeiras' },
    { type: 'p', content: 'As configurações financeiras definem as regras de cobrança do condomínio. Podes actualizá-las a qualquer momento, mas as alterações só têm efeito nas quotas geradas a partir daí.' },
    { type: 'table', headers: ['Configuração', 'O que é'], rows: [
      ['Valor da quota mensal', 'Valor padrão cobrado a todas as unidades sem quota individual (em Kz).'],
      ['Dia de vencimento', 'Dia do mês em que a quota vence (entre 1 e 28).'],
      ['Multa por atraso', 'Percentagem aplicada uma única vez quando a quota passa a estar atrasada.'],
      ['Juros mensais', 'Percentagem adicional aplicada mês a mês sobre o valor em atraso.'],
    ]},
    { type: 'tip', content: 'O sistema mostra uma pré-visualização em tempo real das configurações antes de guardares, para confirmares que está tudo correcto.' },
  ],
};

// ─────────────────────────────────────────────
// CONTENT RENDERER
// ─────────────────────────────────────────────

function ContentRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'h1':
            return (
              <h1 key={i} className="text-3xl font-black text-zinc-900 tracking-tight leading-tight pb-4 border-b border-zinc-100">
                {block.content}
              </h1>
            );
          case 'h2':
            return (
              <h2 key={i} className="text-xl font-bold text-zinc-800 mt-8 mb-2">
                {block.content}
              </h2>
            );
          case 'h3':
            return (
              <h3 key={i} className="text-base font-semibold text-zinc-700 mt-5 mb-1">
                {block.content}
              </h3>
            );
          case 'p':
            return (
              <p key={i} className="text-zinc-600 leading-relaxed text-[15px]">
                {block.content}
              </p>
            );
          case 'ul':
            return (
              <ul key={i} className="space-y-2">
                {block.items?.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-[15px] text-zinc-600">
                    <Circle size={5} className="mt-2 shrink-0 text-orange-400 fill-orange-400" />
                    {item}
                  </li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={i} className="space-y-2.5">
                {block.items?.map((item, j) => (
                  <li key={j} className="flex items-start gap-3 text-[15px] text-zinc-600">
                    <span className="shrink-0 w-6 h-6 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">
                      {j + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
            );
          case 'tip':
            return (
              <div key={i} className="flex gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <div className="shrink-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-white text-[10px] font-black">i</span>
                </div>
                <p className="text-[14px] text-blue-700 leading-relaxed">{block.content}</p>
              </div>
            );
          case 'warning':
            return (
              <div key={i} className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="shrink-0 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-white text-[10px] font-black">!</span>
                </div>
                <p className="text-[14px] text-amber-700 leading-relaxed">{block.content}</p>
              </div>
            );
          case 'badge-list':
            return (
              <div key={i} className="flex flex-wrap gap-2">
                {block.badges?.map((b, j) => (
                  <span key={j} className={`px-3 py-1 rounded-full text-sm font-semibold ${b.color}`}>
                    {b.label}
                  </span>
                ))}
              </div>
            );
          case 'table':
            return (
              <div key={i} className="overflow-x-auto rounded-xl border border-zinc-200">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 border-b border-zinc-200">
                    <tr>
                      {block.headers?.map((h, j) => (
                        <th key={j} className="text-left px-4 py-3 font-semibold text-zinc-700 text-xs uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {block.rows?.map((row, j) => (
                      <tr key={j} className="hover:bg-zinc-50/50 transition-colors">
                        {row.map((cell, k) => (
                          <td key={k} className={`px-4 py-3 text-zinc-600 leading-relaxed ${k === 0 ? 'font-semibold text-zinc-800 whitespace-nowrap' : ''}`}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// SIDEBAR ITEM
// ─────────────────────────────────────────────

function SidebarItem({
  section,
  activeId,
  onSelect,
}: {
  section: Section;
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const isActive = section.subsections.some(s => s.id === activeId);
  const [open, setOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  const Icon = section.icon;

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors group ${
          isActive ? 'bg-orange-50' : 'hover:bg-zinc-50'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Icon size={15} className={isActive ? 'text-orange-500' : `${section.color} group-hover:text-zinc-700`} />
          <span className={`text-sm font-semibold ${isActive ? 'text-orange-600' : 'text-zinc-700'}`}>
            {section.title}
          </span>
        </div>
        <ChevronDown
          size={13}
          className={`text-zinc-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="mt-0.5 ml-6 space-y-0.5 border-l border-zinc-100 pl-3">
          {section.subsections.map(sub => (
            <button
              key={sub.id}
              onClick={() => onSelect(sub.id)}
              className={`w-full text-left px-2 py-1.5 rounded-md text-[13px] transition-colors ${
                activeId === sub.id
                  ? 'text-orange-600 font-semibold bg-orange-50'
                  : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
              }`}
            >
              {sub.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

export default function ManualPage() {
  const [activeId, setActiveId] = useState('o-que-e');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  const allSubsections = SECTIONS.flatMap(s => s.subsections);

  const filtered = search.trim().length > 1
    ? allSubsections.filter(s => s.title.toLowerCase().includes(search.toLowerCase()))
    : [];

  const currentContent = CONTENT[activeId];
  const currentSection = SECTIONS.find(s => s.subsections.some(sub => sub.id === activeId));
  const currentSub = allSubsections.find(s => s.id === activeId);

  // Prev / Next navigation
  const allIds = allSubsections.map(s => s.id);
  const currentIndex = allIds.indexOf(activeId);
  const prevId = currentIndex > 0 ? allIds[currentIndex - 1] : null;
  const nextId = currentIndex < allIds.length - 1 ? allIds[currentIndex + 1] : null;
  const prevSub = prevId ? allSubsections.find(s => s.id === prevId) : null;
  const nextSub = nextId ? allSubsections.find(s => s.id === nextId) : null;

  const navigate = (id: string) => {
    setActiveId(id);
    setSidebarOpen(false);
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">

      {/* ── FIXED HEADER ── */}
      <header className="shrink-0 h-14 border-b border-zinc-200 bg-white/95 backdrop-blur-md flex items-center px-4 gap-4 z-40">
        {/* Logo */}
        <Link href="/" className="shrink-0 flex items-center gap-2 text-zinc-400 hover:text-zinc-700 transition-colors mr-2">
          <ArrowLeft size={15} />
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 bg-orange-500 rounded-lg flex items-center justify-center">
              <Building2 size={13} className="text-white" />
            </div>
            <span className="font-black text-zinc-900 text-sm tracking-tight">CONDO.</span>
          </div>
        </Link>

        <div className="hidden sm:block w-px h-5 bg-zinc-200" />
        <span className="hidden sm:block text-sm font-semibold text-zinc-500">Manual do utilizador</span>

        {/* Search */}
        <div className="flex-1 max-w-sm ml-auto sm:ml-0 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-300 placeholder:text-zinc-400"
          />
          {/* Search dropdown */}
          {filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {filtered.map(item => (
                <button
                  key={item.id}
                  onClick={() => { navigate(item.id); setSearch(''); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  {item.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(v => !v)}
          className="lg:hidden p-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors"
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {/* ── BODY ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── FIXED SIDEBAR ── */}
        <aside className={`
          shrink-0 w-64 border-r border-zinc-100 bg-zinc-50/50 overflow-y-auto
          lg:block
          ${sidebarOpen ? 'fixed inset-0 top-14 z-30 block w-72 bg-white shadow-xl' : 'hidden'}
          lg:relative lg:top-auto lg:z-auto lg:shadow-none
        `}>
          <nav className="p-3 space-y-0.5">
            {SECTIONS.map(section => (
              <SidebarItem
                key={section.id}
                section={section}
                activeId={activeId}
                onSelect={navigate}
              />
            ))}
          </nav>
        </aside>

        {/* Overlay mobile */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 top-14 bg-black/20 z-20"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── SCROLLABLE CONTENT ── */}
        <main ref={contentRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 sm:px-10 py-10">

            {/* Breadcrumb */}
            {currentSection && currentSub && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-6">
                <span>{currentSection.title}</span>
                <ChevronRight size={12} />
                <span className="text-zinc-600 font-medium">{currentSub.title}</span>
              </div>
            )}

            {/* Content */}
            {currentContent ? (
              <ContentRenderer blocks={currentContent} />
            ) : (
              <div className="text-center py-24 text-zinc-400">
                <FileText size={40} className="mx-auto mb-3 opacity-30" />
                <p>Conteúdo em breve.</p>
              </div>
            )}

            {/* Prev / Next navigation */}
            <div className="mt-16 pt-8 border-t border-zinc-100 flex items-center justify-between gap-4">
              {prevSub ? (
                <button
                  onClick={() => navigate(prevId!)}
                  className="flex items-center gap-2 text-sm text-zinc-500 hover:text-orange-600 transition-colors group"
                >
                  <ChevronRight size={16} className="rotate-180 group-hover:-translate-x-0.5 transition-transform" />
                  <div className="text-left">
                    <div className="text-xs text-zinc-400 mb-0.5">Anterior</div>
                    <div className="font-semibold">{prevSub.title}</div>
                  </div>
                </button>
              ) : <div />}

              {nextSub ? (
                <button
                  onClick={() => navigate(nextId!)}
                  className="flex items-center gap-2 text-sm text-zinc-500 hover:text-orange-600 transition-colors group text-right"
                >
                  <div>
                    <div className="text-xs text-zinc-400 mb-0.5">Seguinte</div>
                    <div className="font-semibold">{nextSub.title}</div>
                  </div>
                  <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              ) : <div />}
            </div>

            <p className="text-center text-xs text-zinc-300 mt-12 pb-4">
              © {new Date().getFullYear()} CONDO. — Sistema de Gestão de Condomínios
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}