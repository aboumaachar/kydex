import { KydexAuthProvider } from "../../components/kydex/kydex-auth-provider"

export default function KydexLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <KydexAuthProvider>
      {children}
    </KydexAuthProvider>
  )
}
