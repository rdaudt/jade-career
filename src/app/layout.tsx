import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Career Dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="border-b p-4 flex gap-4 text-sm">
          <a href="/">Overview</a>
          <a href="/network">Network</a>
          <a href="/stay-current">Stay Current</a>
          <a href="/career">Career</a>
          <a href="/settings">Settings</a>
        </nav>
        {children}
      </body>
    </html>
  )
}
