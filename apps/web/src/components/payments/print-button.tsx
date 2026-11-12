'use client';

import { Button } from '../ui';

/** Print the receipt without the application chrome around it. */
export const PrintButton = () => (
  <Button type="button" variant="secondary" className="print:hidden" onClick={() => window.print()}>
    Print receipt
  </Button>
);
