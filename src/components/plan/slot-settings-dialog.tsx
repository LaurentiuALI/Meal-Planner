'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Plus, Trash2 } from 'lucide-react';
import { useSlotStore } from '@/store/useSlotStore';
import { addSlot, deleteSlot, updateSlots } from '@/actions/slots';
import { Slot } from '@/types';

export function SlotSettingsDialog() {
  const { slots, loadSlots } = useSlotStore();
  const [localSlots, setLocalSlots] = useState<Slot[]>([]);
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
        loadSlots();
    }
  }, [open, loadSlots]);

  useEffect(() => {
    setLocalSlots(slots);
  }, [slots]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
        await updateSlots(localSlots);
        await loadSlots(); // Reload to ensure sync
        setOpen(false);
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
      if (!confirm('Are you sure? Existing meals in this slot might be hidden.')) return;
      await deleteSlot(id);
      await loadSlots();
  };
  
  const handleAdd = async () => {
      const newSlotName = `Slot ${localSlots.length + 1}`;
      const newSlot = { name: newSlotName, time: '12:00', sortOrder: localSlots.length };
      await addSlot(newSlot);
      await loadSlots();
  };

  const handleChange = (id: string, field: keyof Slot, value: string | number) => {
      setLocalSlots(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Configure Slots">
          <Settings className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Meal Slots Configuration</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                {localSlots.map((slot, index) => (
                    <div key={slot.id || index} className="flex items-center gap-2">
                        <Input 
                            value={slot.name} 
                            onChange={(e) => handleChange(slot.id, 'name', e.target.value)}
                            className="flex-1"
                            placeholder="Slot Name"
                        />
                        <Input 
                            type="time"
                            value={slot.time}
                            onChange={(e) => handleChange(slot.id, 'time', e.target.value)}
                            className="w-28"
                        />
                         <Button variant="ghost" size="icon" onClick={() => handleDelete(slot.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                    </div>
                ))}
            </div>
            <Button onClick={handleAdd} variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Add Slot
            </Button>
        </div>
        <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
