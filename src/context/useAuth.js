import { createContext, useContext } from "react";

// Context + hook ficam num arquivo separado do AuthProvider (AuthContext.jsx)
// só por causa do react-refresh/only-export-components: um arquivo que
// exporta um componente (AuthProvider) junto de não-componentes (o context
// object e o hook) quebra o Fast Refresh. A maioria das telas só precisa do
// hook `useAuth`, então elas importam daqui; só o App.jsx precisa também do
// `AuthProvider`, importado separadamente de AuthContext.jsx.
export const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }
