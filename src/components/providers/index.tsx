import { FC, ReactNode } from "react";
import { ThemeProvider } from "./theme-provider";
import { AuthProvider } from "./auth-context-provider";
import TanstackQueryProvider from "./tanstack-query-provider";

interface Props {
  children: ReactNode;
}

const Providers: FC<Props> = ({ children }) => {
  return (
    <ThemeProvider defaultTheme="system" storageKey="fireboard-theme">
      <TanstackQueryProvider>
        <AuthProvider>{children}</AuthProvider>
      </TanstackQueryProvider>
    </ThemeProvider>
  );
};

export default Providers;
