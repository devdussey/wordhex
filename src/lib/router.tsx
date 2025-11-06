import {
  createContext,
  type MutableRefObject,
  type PropsWithChildren,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type RouterContextValue = {
  pathname: string;
  navigate: (to: string, options?: { replace?: boolean }) => void;
};

const RouterContext = createContext<RouterContextValue | null>(null);

function getPathname() {
  if (typeof window === 'undefined') {
    return '/';
  }
  return window.location.pathname || '/';
}

function useStableCallback<T extends (...args: never[]) => unknown>(callback: T): T {
  const callbackRef = useRef(callback) as MutableRefObject<T>;
  callbackRef.current = callback;

  return useMemo(
    () =>
      ((...args: Parameters<T>) => {
        return callbackRef.current(...args);
      }) as T,
    []
  );
}

export function Router({ children }: PropsWithChildren) {
  const [pathname, setPathname] = useState(getPathname);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(getPathname());
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigate = useStableCallback((to: string, options?: { replace?: boolean }) => {
    if (typeof window === 'undefined') {
      return;
    }

    const normalized = to.startsWith('/') ? to : `/${to}`;
    if (options?.replace) {
      window.history.replaceState(null, '', normalized);
    } else {
      window.history.pushState(null, '', normalized);
    }
    setPathname(normalized);
  });

  const value = useMemo<RouterContextValue>(() => ({ pathname, navigate }), [pathname, navigate]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a <Router> component');
  }
  return context;
}

type RoutesProps = PropsWithChildren;

export function Routes({ children }: RoutesProps) {
  return <>{children}</>;
}

type RouteProps = {
  path: string;
  element: ReactNode;
};

function normalizePath(path: string) {
  if (!path.startsWith('/')) {
    return `/${path}`;
  }
  return path;
}

function matchPath(path: string, currentPath: string) {
  if (path === '*') {
    return true;
  }

  const normalizedPath = normalizePath(path);
  const normalizedCurrent = normalizePath(currentPath);

  if (normalizedPath.endsWith('/*')) {
    const base = normalizedPath.slice(0, -2);
    return normalizedCurrent === base || normalizedCurrent.startsWith(`${base}/`);
  }

  return normalizedPath === normalizedCurrent;
}

export function Route({ path, element }: RouteProps) {
  const { pathname } = useRouter();

  if (matchPath(path, pathname)) {
    return <>{element}</>;
  }

  return null;
}

type NavigateProps = {
  to: string;
  replace?: boolean;
};

export function Navigate({ to, replace }: NavigateProps) {
  const { navigate } = useRouter();

  useEffect(() => {
    navigate(to, { replace });
  }, [navigate, to, replace]);

  return null;
}

type NavLinkProps = {
  to: string;
  end?: boolean;
  className?: string | ((args: { isActive: boolean }) => string);
  children: ReactNode;
};

export function NavLink({ to, end = false, className, children }: NavLinkProps) {
  const { pathname, navigate } = useRouter();
  const normalized = normalizePath(to);
  const isActive = end ? pathname === normalized : pathname === normalized || pathname.startsWith(`${normalized}/`);
  const computedClassName = typeof className === 'function' ? className({ isActive }) : className ?? '';

  return (
    <a
      href={normalized}
      className={computedClassName}
      onClick={(event) => {
        event.preventDefault();
        navigate(normalized);
      }}
    >
      {children}
    </a>
  );
}

export function useLocation() {
  const { pathname } = useRouter();
  return useMemo(() => ({ pathname }), [pathname]);
}

export function useNavigate() {
  const { navigate } = useRouter();
  return navigate;
}

