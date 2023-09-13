import {
  useEffect,
  useState,
  useRef,
  ComponentType,
  PropsWithChildren,
} from "react";
import LiveContext from "./LiveContext";
import { generateElement, renderElementAsync } from "../../utils/transpile";
import { themes } from "prism-react-renderer";

type ProviderState = {
  element?: ComponentType | null;
  error?: string;
};

type Props = {
  code?: string;
  disabled?: boolean;
  enableTypeScript?: boolean;
  language?: string;
  noInline?: boolean;
  skipInitialRender?: boolean;
  scope?: Record<string, unknown>;
  theme?: typeof themes.nightOwl;
  transformCode?(code: string): string;
};

function LiveProvider({
  children,
  code = "",
  language = "tsx",
  theme,
  enableTypeScript = true,
  disabled = false,
  scope,
  transformCode,
  noInline = false,
  skipInitialRender = false,
}: PropsWithChildren<Props>) {
  // avoid to render code twice when rendered initially (ssr)
  const cache = useRef("initial");

  // ssr render the code in sync
  const [state, setState] = useState<ProviderState>(() => transpileSync(code));

  function transpileSync(code: string) {
    const returnObject: ProviderState = {
      element: undefined,
      error: undefined,
    };

    if (!skipInitialRender) {
      const renderElement = (element: ComponentType) => {
        return (returnObject.element = element);
      };
      const errorCallback = (error: unknown) => {
        return (returnObject.error = String(error));
      };

      try {
        const transformResult = transformCode ? transformCode(code) : code;

        // Transpilation arguments
        const input = {
          code: transformResult,
          scope,
          enableTypeScript,
        };

        if (noInline) {
          renderElementAsync(input, renderElement, errorCallback);
        } else {
          renderElement(generateElement(input, errorCallback));
        }

        cache.current = code;
      } catch (e) {
        errorCallback(e);
      }
    }

    return returnObject;
  }

  async function transpileAsync(newCode: string) {
    if (cache.current === newCode) {
      cache.current = "used"; // do not check for null or undefined, in case the new code is such
      return Promise.resolve();
    }

    const errorCallback = (error: Error) => {
      setState({ error: error.toString(), element: undefined });
    };

    // - transformCode may be synchronous or asynchronous.
    // - transformCode may throw an exception or return a rejected promise, e.g.
    //   if newCode is invalid and cannot be transformed.
    // - Not using async-await to since it requires targeting ES 2017 or
    //   importing regenerator-runtime... in the next major version of
    //   react-live, should target ES 2017+
    try {
      const transformResult = transformCode ? transformCode(newCode) : newCode;
      try {
        const transformedCode = await Promise.resolve(transformResult);
        const renderElement = (element: ComponentType) =>
          setState({ error: undefined, element });

        if (typeof transformedCode !== "string") {
          throw new Error("Code failed to transform");
        }

        // Transpilation arguments
        const input = {
          code: transformedCode,
          scope,
          enableTypeScript,
        };

        if (noInline) {
          setState({ error: undefined, element: null }); // Reset output for async (no inline) evaluation
          renderElementAsync(input, renderElement, errorCallback);
        } else {
          renderElement(generateElement(input, errorCallback));
        }
      } catch (error) {
        return errorCallback(error as Error);
      }
    } catch (e) {
      errorCallback(e as Error);
      return Promise.resolve();
    }
  }

  const onError = (error: Error) => setState({ error: error.toString() });

  useEffect(() => {
    transpileAsync(code).catch(onError);
  }, [code, scope, noInline, transformCode]);

  const onChange = (newCode: string) => {
    transpileAsync(newCode).catch(onError);
  };

  return (
    <LiveContext.Provider
      value={{
        ...state,
        code,
        language,
        theme,
        disabled,
        onError,
        onChange,
      }}
    >
      {children}
    </LiveContext.Provider>
  );
}

export default LiveProvider;
