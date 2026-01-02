'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface YearlyReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (year: number) => void;
}

export function YearlyReportDialog({ isOpen, onOpenChange, onSubmit }: YearlyReportDialogProps) {
  const [year, setYear] = useState(new Date().getFullYear());
  const { toast } = useToast();

  const handleGenerate = () => {
    if (!year || year < 1900 || year > 2100) {
      toast({
        variant: 'destructive',
        title: 'Invalid Year',
        description: 'Please enter a valid year.',
      });
      return;
    }
    onSubmit(year);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate Yearly Report</DialogTitle>
          <DialogDescription>
            Enter the year for which you want to generate the renewals report.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="year-input" className="text-right">
              Year
            </Label>
            <Input
              id="year-input"
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="col-span-3"
              placeholder="e.g., 2025"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleGenerate}>Generate Report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
