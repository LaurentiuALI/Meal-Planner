'use client';

import { useEffect, useState } from 'react';
import { useTemplateStore } from '@/store/useTemplateStore';
import { createPlanTemplate, applyPlanToSchedule } from '@/actions/templates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TemplateEditor } from '@/components/templates/template-editor';
import { Plus, Trash2, Calendar, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function PlansPage() {
  const { templates, loadTemplates, setActiveTemplate, activeTemplateId, getActiveTemplate } = useTemplateStore();
  const [newPlanName, setNewPlanName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleCreate = async () => {
    if (!newPlanName.trim()) return;
    setIsCreating(true);
    await createPlanTemplate(newPlanName);
    await loadTemplates();
    setNewPlanName('');
    setIsCreating(false);
  };

  const activeTemplate = getActiveTemplate();
  const activePlanCount = templates.filter(t => t.isActive).length;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar: List of Plans */}
      <aside className="w-64 border-r bg-muted/20 p-4 overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">My Plans</h2>
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

        <div className="space-y-1 flex-1">
          {templates.map(template => (
            <div 
              key={template.id}
              onClick={() => setActiveTemplate(template.id)}
              className={`
                p-2 rounded-md cursor-pointer text-sm font-medium transition-colors flex justify-between items-center
                ${activeTemplateId === template.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}
              `}
            >
              <div>
                  {template.name}
                  <div className="text-xs opacity-70 font-normal">
                    {template.days.length} Days
                  </div>
              </div>
              {template.isActive && <CheckCircle2 className="w-4 h-4 text-green-500" />}
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content: Plan Editor */}
      <main className="flex-1 overflow-hidden flex flex-col bg-slate-50">
        {activePlanCount > 1 && (
            <div className="p-4 pb-0">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Multiple Active Plans</AlertTitle>
                    <AlertDescription>
                        You have {activePlanCount} active plans. Your shopping list will aggregate ingredients from ALL of them.
                    </AlertDescription>
                </Alert>
            </div>
        )}

        {activeTemplate ? (
          <TemplateEditor template={activeTemplate} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a plan to edit or create a new one.
          </div>
        )}
      </main>
    </div>
  );
}