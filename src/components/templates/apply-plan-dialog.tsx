'use client';

import { useState } from 'react';
import { PlanTemplate } from '@/types';
import { applyPlanToSchedule } from '@/actions/templates';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';

interface ApplyPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: PlanTemplate;
}

export function ApplyPlanDialog({ open, onOpenChange, template }: ApplyPlanDialogProps) {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [isApplying, setIsApplying] = useState(false);
  const router = useRouter();

  const handleApply = async () => {
    setIsApplying(true);
    try {
        await applyPlanToSchedule(template.id, startDate);
        onOpenChange(false);
        router.push('/plan'); // Redirect to calendar view
    } catch (error) {
        console.error("Failed to apply plan", error);
        // Show toast error here ideally
    } finally {
        setIsApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply Plan to Schedule</DialogTitle>
          <DialogDescription>
            This will copy the {template.days.length} days of "<strong>{template.name}</strong>" to your calendar starting from the date below.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="start-date" className="text-right">
              Start Date
            </Label>
            <Input
              id="start-date"
              type="date"
              className="col-span-3"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleApply} disabled={isApplying}>
                {isApplying ? 'Applying...' : 'Apply Plan'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
