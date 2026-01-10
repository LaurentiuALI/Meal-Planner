'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToolStore } from '@/store/useToolStore';
import { Trash2, Plus, Wrench } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ToolsManager() {
  const { tools, fetchTools, addTool, removeTool } = useToolStore();
  const [newToolName, setNewToolName] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTools();
    }
  }, [isOpen, fetchTools]);

  const handleAdd = async () => {
    if (!newToolName.trim()) return;
    await addTool(newToolName);
    setNewToolName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Wrench className="mr-2 h-4 w-4" /> Manage Tools
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Kitchen Tools</DialogTitle>
          <DialogDescription>
            Add or remove the cookware available for your recipes.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-2 my-4">
          <Input
            placeholder="New tool name (e.g. Wok, Blender)"
            value={newToolName}
            onChange={(e) => setNewToolName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button onClick={handleAdd} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="h-[300px] w-full rounded-md border p-4">
          <div className="space-y-2">
            {tools.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tools added yet.
              </p>
            ) : (
              tools.map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <span className="text-sm font-medium">{tool.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive/90"
                    onClick={() => removeTool(tool.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
