export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <h1 className="auth-logo-title">
            <span className="text-brand">Mr.</span>
            <span>Chifles</span>
          </h1>
          <p className="auth-logo-subtitle">
            Sales Management System
          </p>
        </div>

        {children}
      </div>
    </div>
  )
}
