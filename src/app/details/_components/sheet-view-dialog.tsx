
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { type SheetDefinition, type SheetCell } from '@/types';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { Upload, DownloadCloud } from 'lucide-react';

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
  const { toast } = useToast();

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
  
  const columnHeaders = useMemo(() => {
    if (!sheet) return [];
    return Array.from({ length: sheet.cols }).map((_, i) => getColumnName(i));
  }, [sheet]);


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

  const handleExport = () => {
    if (grid.length === 0) {
      toast({ title: 'No Data', description: 'There is no data to export.' });
      return;
    }
    const dataToExport = grid.map(row => {
        const rowData: Record<string, string> = {};
        columnHeaders.forEach((header, index) => {
            rowData[header] = row[index] || '';
        });
        return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    XLSX.writeFile(workbook, `${sheet.name.replace(/ /g, '_')}.xlsx`);
    toast({ title: 'Success', description: 'Sheet exported to Excel.' });
  };
  
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

        if (json.length === 0) {
          toast({ variant: 'destructive', title: 'Import Error', description: 'Excel file is empty.' });
          return;
        }

        const importedGrid = Array(sheet.rows).fill(null).map(() => Array(sheet.cols).fill(''));
        let changesMade = false;

        // Skip header row if it exists
        const dataRows = json.length > 1 && columnHeaders.every((h, i) => json[0][i] === h) ? json.slice(1) : json;

        dataRows.forEach((row, rowIndex) => {
            if (rowIndex < sheet.rows) {
                row.forEach((cellValue, colIndex) => {
                    if (colIndex < sheet.cols) {
                        const currentValue = grid[rowIndex][colIndex] || '';
                        const newValue = cellValue || '';
                        if (currentValue !== newValue) {
                            importedGrid[rowIndex][colIndex] = newValue;
                            onCellChange(sheet.id, rowIndex, colIndex, newValue);
                            changesMade = true;
                        } else {
                            importedGrid[rowIndex][colIndex] = currentValue;
                        }
                    }
                });
            }
        });
        
        // Fill remaining cells from original grid
        for (let r = 0; r < sheet.rows; r++) {
            for (let c = 0; c < sheet.cols; c++) {
                if (importedGrid[r][c] === '') {
                    importedGrid[r][c] = grid[r]?.[c] || '';
                }
            }
        }
        
        setGrid(importedGrid);

        if(changesMade) {
          toast({ title: 'Import Successful', description: 'Sheet data has been updated from the Excel file.' });
        } else {
          toast({ title: 'No Changes', description: 'The imported data is identical to the current sheet.' });
        }

      } catch (error) {
        console.error('Excel import error:', error);
        toast({ variant: 'destructive', title: 'Import Error', description: 'Failed to read or process the Excel file.' });
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = ''; // Reset file input
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
           <div className="flex justify-between items-center">
             <div>
                <DialogTitle>{sheet.name}</DialogTitle>
                <DialogDescription>
                    Edit your sheet content below. Data is encrypted on save.
                </DialogDescription>
             </div>
             <div className="flex gap-2">
              <input type="file" id="import-sheet-excel" className="hidden" accept=".xlsx, .xls" onChange={handleImport} />
              <Button variant="outline" size="sm" onClick={() => document.getElementById('import-sheet-excel')?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <DownloadCloud className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
           </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden p-6 pt-0">
          <ScrollArea className="h-full w-full rounded-md border">
            <div className="relative p-2">
              <table className="border-collapse table-fixed w-full">
                <thead>
                  <tr className='bg-background'>
                    <th className="sticky top-0 left-0 z-20 w-16 bg-muted/50 border border-border"></th>
                    {columnHeaders.map((header, colIndex) => (
                      <th key={colIndex} className="sticky top-0 w-40 p-2 text-center font-semibold bg-muted/50 border border-border">
                        {header}
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
