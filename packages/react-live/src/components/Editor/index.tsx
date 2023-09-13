import { Highlight, Prism, themes } from "prism-react-renderer";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useEditable } from "use-editable";

export type Props = {
  className?: string;
  code: string;
  disabled?: boolean;
  language: string;
  prism?: typeof Prism;
  style?: CSSProperties;
  tabMode?: "focus" | "indentation";
  theme?: typeof themes.nightOwl;
  onChange?(value: string): void;
  editorRef?: React.RefObject<HTMLPreElement>;
} & Omit<React.HTMLAttributes<HTMLPreElement>, "onChange">;

const CodeEditor = (props: Props) => {
  const {
    code: origCode,
    className,
    style,
    tabMode,
    theme: origTheme,
    prism,
    language,
    disabled,
    onChange,
    editorRef,
    ...rest
  } = props;

  const _editorRef = editorRef || useRef(null);
  const [code, setCode] = useState(origCode || "");
  const { theme } = props;

  useEffect(() => {
    setCode(origCode);
  }, [origCode]);

  useEditable(_editorRef, (text) => setCode(text.slice(0, -1)), {
    disabled: disabled,
    indentation: tabMode === "indentation" ? 2 : undefined,
  });

  useEffect(() => {
    if (onChange) {
      onChange(code);
    }
  }, [code]);

  return (
    <div className={className} style={style}>
      <Highlight
        prism={prism || Prism}
        code={code}
        theme={origTheme || themes.nightOwl}
        language={language}
      >
        {({
          className: _className,
          tokens,
          getLineProps,
          getTokenProps,
          style: _style,
        }) => (
          <pre
            className={_className}
            style={{
              margin: 0,
              outline: "none",
              padding: 10,
              fontFamily: "inherit",
              ...(theme && typeof theme.plain === "object" ? theme.plain : {}),
              ..._style,
            }}
            ref={_editorRef}
            spellCheck="false"
            {...rest}
          >
            {tokens.map((line, lineIndex) => (
              <span key={`line-${lineIndex}`} {...getLineProps({ line })}>
                {line
                  .filter((token) => !token.empty)
                  .map((token, tokenIndex) => (
                    <span
                      key={`token-${tokenIndex}`}
                      {...getTokenProps({ token })}
                    />
                  ))}
                {"\n"}
              </span>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
};

CodeEditor.defaultProps = {
  tabMode: "indentation",
} as Pick<Props, "tabMode">;

export default CodeEditor;
