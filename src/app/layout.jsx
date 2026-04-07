import "./globals.css";

export const metadata = {
  title: "Danabri Panel",
  description: "Panel administrativo",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  );
}
