import { FC, ReactNode } from "react";
import { Toaster } from "sonner";

import TanstackQueryProvider from "./tanstack-query-provider";
import { AuthProvider } from "./auth-context-provider";
import { ThemeProvider } from "./theme-provider";

interface Props {
  children: ReactNode;
}

const Providers: FC<Props> = ({ children }) => {
  return (
    <ThemeProvider defaultTheme="system" storageKey="fireboard-theme">
      <TanstackQueryProvider>
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="bottom-right" richColors closeButton />
      </TanstackQueryProvider>
    </ThemeProvider>
  );
};

export default Providers;
