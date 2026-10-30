export default function HomePage() {
  return (
    <main style={{ padding: '3rem', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6' }}>
      <h1 style={{ color: '#1e293b' }}>Pukale Furnishing Centre API</h1>
      <p style={{ color: '#475569', fontSize: '1.1rem' }}>
        Next.js &amp; PostgreSQL Backend API is running successfully.
      </p>
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', marginTop: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0' }}>API Status: Active</h3>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#334155' }}>
          <li><strong>Auth:</strong> <code>/api/auth/login</code></li>
          <li><strong>Customers:</strong> <code>/api/customers</code></li>
          <li><strong>Quotations:</strong> <code>/api/quotations</code></li>
          <li><strong>Products:</strong> <code>/api/products</code></li>
          <li><strong>Dashboard:</strong> <code>/api/dashboard</code></li>
          <li><strong>Particulars:</strong> <code>/api/particulars</code></li>
          <li><strong>Settings:</strong> <code>/api/settings</code></li>
        </ul>
      </div>
    </main>
  );
}
