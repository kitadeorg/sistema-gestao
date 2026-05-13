/**
 * Layout da página de autenticação.
 * Força sempre o tema claro — independentemente do tema seleccionado na dashboard.
 * O atributo `data-force-light` é usado no globals.css para sobrepor o .dark.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-force-light className="light" style={{ colorScheme: 'light' }}>
      {children}
    </div>
  );
}
