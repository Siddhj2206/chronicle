export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen items-center justify-center"
    >
      {children}
    </main>
  );
}
