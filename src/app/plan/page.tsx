'use client';

import { useEffect, useState } from 'react';
import { useTemplateStore } from '@/store/useTemplateStore';
import { TemplateEditor } from '@/components/templates/template-editor';
import { AlertTriangle, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SidebarContent } from '@/components/plan/sidebar-content';

export default function PlansPage() {
  const { templates, loadTemplates, getActiveTemplate, activeTemplateId, setActiveTemplate } = useTemplateStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Auto-select logic
  useEffect(() => {
    // Only run if we have templates but no active selection
    if (!activeTemplateId && templates.length > 0) {
        // 1. Try to find first active
        const firstActive = templates.find(t => t.isActive);
        if (firstActive) {
            setActiveTemplate(firstActive.id);
        } else {
            // 2. Fallback to first plan
            setActiveTemplate(templates[0].id);
        }
    }
  }, [templates, activeTemplateId, setActiveTemplate]);

  const activeTemplate = getActiveTemplate();
  const activePlanCount = templates.filter(t => t.isActive).length;

  return (
    <div className="flex h-[calc(100dvh-9rem)] md:h-[calc(100vh-8rem)] flex-col md:flex-row -mx-4 -my-6 md:mx-0 md:my-0">
      {/* Mobile Sidebar Logic - Now passed to TemplateEditor */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-80 p-4 pt-10">
            <SidebarContent onPlanSelect={() => setIsMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

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
          <TemplateEditor 
            template={activeTemplate} 
            mobileNavTrigger={
                <Button variant="ghost" size="icon" className="-ml-2" onClick={() => setIsMobileMenuOpen(true)}>
                    <Menu className="w-5 h-5" />
                </Button>
            }
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground p-4 text-center flex-col gap-4">
            <p>{templates.length === 0 ? "Create your first plan to get started." : "Select a plan to edit."}</p>
            {/* Show mobile menu trigger if no plan selected so they can select one */}
            <div className="md:hidden">
                <Button onClick={() => setIsMobileMenuOpen(true)} variant="outline">
                    <Menu className="w-4 h-4 mr-2" /> Open Menu
                </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
