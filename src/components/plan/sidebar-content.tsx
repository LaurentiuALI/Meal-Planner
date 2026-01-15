'use client';

import { useState } from 'react';
import { useTemplateStore } from '@/store/useTemplateStore';
import { createPlanTemplate } from '@/actions/templates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, CheckCircle2, Trash2 } from 'lucide-react';
import { SlotSettingsDialog } from '@/components/plan/slot-settings-dialog';

interface SidebarContentProps {
  onPlanSelect?: () => void;
}

export function SidebarContent({ onPlanSelect }: SidebarContentProps) {
  const { templates, loadTemplates, setActiveTemplate, activeTemplateId, deleteTemplate } = useTemplateStore();
  const [newPlanName, setNewPlanName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!newPlanName.trim()) return;
    setIsCreating(true);
    await createPlanTemplate(newPlanName);
    await loadTemplates();
    setNewPlanName('');
    setIsCreating(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this plan?')) {
      await deleteTemplate(id);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">My Plans</h2>
        <SlotSettingsDialog />
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="flex gap-2">
          <Input 
            placeholder="New Plan Name..." 
            value={newPlanName}
            onChange={(e) => setNewPlanName(e.target.value)}
            className="h-8 text-sm"
          />
          <Button size="sm" onClick={handleCreate} disabled={!newPlanName || isCreating}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-1 flex-1 overflow-y-auto">
        {templates.map(template => (
          <div 
            key={template.id}
            onClick={() => {
                setActiveTemplate(template.id);
                onPlanSelect?.();
            }}
            className={`
              p-2 rounded-md cursor-pointer text-sm font-medium transition-colors flex justify-between items-center group
              ${activeTemplateId === template.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}
            `}
          >
            <div>
                {template.name}
                <div className="text-xs opacity-70 font-normal">
                  {template.days.length} Days
                </div>
            </div>
            <div className="flex items-center gap-2">
              {template.isActive && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ${activeTemplateId === template.id ? 'text-primary-foreground hover:text-primary-foreground/80 hover:bg-primary/80' : ''}`}
                onClick={(e) => handleDelete(e, template.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
