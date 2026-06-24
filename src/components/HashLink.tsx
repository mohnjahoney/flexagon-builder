import type { AnchorHTMLAttributes, ReactNode } from "react";

type HashLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: string;
  children: ReactNode;
};

export function HashLink({ to, children, ...props }: HashLinkProps) {
  return (
    <a href={`#${to}`} {...props}>
      {children}
    </a>
  );
}
