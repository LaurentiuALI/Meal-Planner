'use client';

import { useEffect, useState } from 'react';
import { useTemplateStore } from '@/store/useTemplateStore';
import { TemplateEditor } from '@/components/templates/template-editor';
import { AlertTriangle, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarContent } from '@/components/plan/sidebar-content';

export default function PlansPage() {
  const { templates, loadTemplates, getActiveTemplate } = useTemplateStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]); // Added dependency

  const activeTemplate = getActiveTemplate();
  const activePlanCount = templates.filter(t => t.isActive).length;

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
                <SidebarContent onPlanSelect={() => setIsMobileMenuOpen(false)} />
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
