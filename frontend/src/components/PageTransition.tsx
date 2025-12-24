import type { PropsWithChildren } from 'react';
import './PageTransition.css';

type PageTransitionProps = PropsWithChildren<{
  transitionKey?: string;
  testId?: string;
}>;

export const PageTransition = ({ transitionKey, testId, children }: PageTransitionProps) => {
  return (
    <div
      className="page-transition"
      key={transitionKey}
      data-transition-key={transitionKey}
      data-testid={testId}
    >
      {children}
    </div>
  );
};
