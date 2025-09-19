
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { type SheetDefinition, type SheetCell } from '@/types';

interface SheetViewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sheet: SheetDefinition | null;
  cells: SheetCell[];
  onCellChange: (sheetId: string, row: number, col: number, value: string) => void;
  encrypt: (text: string) => string;
  decrypt: (ciphertext: string) => string;
}

export function SheetViewDialog({ isOpen, onOpenChange, sheet, cells, onCellChange, encrypt, decrypt }: SheetViewDialogProps) {
  const [grid, setGrid] = useState<string[][]>([]);

  useEffect(() => {
    if (sheet) {
      const initialGrid = Array(sheet.rows)
        .fill(null)
        .map(() => Array(sheet.cols).fill(''));
      
      cells.forEach(cell => {
        if (cell.row < sheet.rows && cell.col < sheet.cols) {
          try {
            initialGrid[cell.row][cell.col] = decrypt(cell.value);
          } catch (e) {
            // If decryption fails, show the encrypted value to avoid data loss
            initialGrid[cell.row][cell.col] = cell.value;
            console.error(`Failed to decrypt cell (${cell.row}, ${cell.col})`, e);
          }
        }
      });
      setGrid(initialGrid);
    }
  }, [sheet, cells, decrypt]);
  
  if (!sheet) return null;

  const handleInputChange = (row: number, col: number, value: string) => {
    const newGrid = [...grid];
    newGrid[row][col] = value;
    setGrid(newGrid);
  };

  const handleInputBlur = (row: number, col: number) => {
    const value = grid[row][col];
    onCellChange(sheet.id, row, col, value);
  };
  
  // Helper to generate column headers like A, B, ..., Z, AA, AB, ...
  const getColumnName = (num: number) => {
    let name = '';
    let tempNum = num;
    while (tempNum >= 0) {
      name = String.fromCharCode(65 + (tempNum % 26)) + name;
      tempNum = Math.floor(tempNum / 26) - 1;
    }
    return name;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>{sheet.name}</DialogTitle>
          <DialogDescription>
            Edit your sheet content below. Data is encrypted on save and decrypted for display.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden p-6 pt-0">
          <ScrollArea className="h-full w-full rounded-md border">
            <div className="relative p-2">
              <table className="border-collapse table-fixed w-full">
                <thead>
                  <tr className='bg-background'>
                    <th className="sticky top-0 left-0 z-20 w-16 bg-muted/50 border border-border"></th>
                    {Array.from({ length: sheet.cols }).map((_, colIndex) => (
                      <th key={colIndex} className="sticky top-0 w-40 p-2 text-center font-semibold bg-muted/50 border border-border">
                        {getColumnName(colIndex)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: sheet.rows }).map((_, rowIndex) => (
                    <tr key={rowIndex}>
                      <td className="sticky left-0 w-16 p-2 text-center font-semibold bg-muted/50 border border-border">{rowIndex + 1}</td>
                      {Array.from({ length: sheet.cols }).map((_, colIndex) => (
                        <td key={colIndex} className="border border-border p-0">
                          <Input
                            type="text"
                            className="w-40 h-full p-2 border-none rounded-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:z-10 relative"
                            value={grid[rowIndex]?.[colIndex] || ''}
                            onChange={(e) => handleInputChange(rowIndex, colIndex, e.target.value)}
                            onBlur={() => handleInputBlur(rowIndex, colIndex)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
             <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
