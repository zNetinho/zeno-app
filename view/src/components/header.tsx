import { useOptionalUser } from "@/lib/hooks";
import { DecoButton } from "./deco-button";


export function Header() {

  const { data: user } = useOptionalUser();
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <a href="/">
              <img src="/logo.png" loading="eager" alt="Zeno App" className="h-auto w-28" />
              <h1 className="text-xl font-semibold text-gray-900 sr-only">Zeno App</h1>
            </a>
          </div>

          <nav className="flex items-center space-x-8">
            {!user ? (
              <span className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200">
                <DecoButton />
              </span>
            ) : (
              <>
                <a
                  href="/"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                >
                  Gestão de Gastos
                </a>
                <a
                  href="/todos"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                >
                  TODO
                </a>
                <a
                  href="/profile"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                >
                  Perfil
                </a>
                <DecoButton />
              </>
            )}
          </nav>

        </div>
      </div>
    </header>
  );
}
