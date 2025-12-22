import type { PropsWithChildren } from 'react';
import './PageTransition.css';

type PageTransitionProps = PropsWithChildren<{
  transitionKey?: string;
}>;

export const PageTransition = ({ transitionKey, children }: PageTransitionProps) => {
  return (
    <div className="page-transition" key={transitionKey} data-transition-key={transitionKey}>
      {children}
    </div>
  );
};
