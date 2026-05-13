/**
 * Layout da página de setup (primeiro login).
 * Força sempre o tema claro — é uma página de onboarding, não de dashboard.
 */
export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-force-light className="light" style={{ colorScheme: 'light' }}>
      {children}
    </div>
  );
}
