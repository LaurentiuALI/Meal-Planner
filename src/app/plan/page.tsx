'use client';

import { useEffect, useState } from 'react';
import { useTemplateStore } from '@/store/useTemplateStore';
import { createPlanTemplate } from '@/actions/templates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TemplateEditor } from '@/components/templates/template-editor';
import { Plus, CheckCircle2, AlertTriangle, Menu, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { SlotSettingsDialog } from '@/components/plan/slot-settings-dialog';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function PlansPage() {
  const { templates, loadTemplates, setActiveTemplate, activeTemplateId, getActiveTemplate } = useTemplateStore();
  const [newPlanName, setNewPlanName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const SidebarContent = () => (
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
                setIsMobileMenuOpen(false);
            }}
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
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-9rem)] md:h-[calc(100vh-8rem)] flex-col md:flex-row -mx-4 -my-6 md:mx-0 md:my-0">
      {/* Mobile Sidebar Trigger */}
      <div className="md:hidden p-4 border-b flex items-center justify-between bg-background">
        <span className="font-semibold">
            {activeTemplate ? activeTemplate.name : 'Select a Plan'}
        </span>
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Menu className="w-5 h-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-4 pt-10">
                <SidebarContent />
            </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r bg-muted/20 p-4 flex-col">
        <SidebarContent />
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
          <div className="flex-1 flex items-center justify-center text-muted-foreground p-4 text-center">
            Select a plan to edit or create a new one.
          </div>
        )}
      </main>
    </div>
  );
}