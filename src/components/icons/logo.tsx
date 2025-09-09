import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5.5 8.5L12 12l6.5-3.5" />
      <path d="M5.5 15.5L12 12l6.5 3.5" />
      <path d="M12 22V12" />
      <path d="M12 2L5.5 5.5 12 9l6.5-3.5L12 2z" />
    </svg>
  );
}
