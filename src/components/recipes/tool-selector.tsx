'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToolStore } from '@/store/useToolStore';
import { Badge } from '@/components/ui/badge';

interface ToolSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function ToolSelector({ selectedIds, onChange }: ToolSelectorProps) {
  const { tools, fetchTools, addTool } = useToolStore();
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  React.useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleCreate = async () => {
    if (!inputValue) return;
    const term = inputValue; // Capture current value
    setOpen(false); // Close immediately for feedback
    setInputValue('');
    const newTool = await addTool(term);
    onChange([...selectedIds, newTool.id]);
  };

  const selectedTools = tools.filter((t) => selectedIds.includes(t.id));

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedTools.length > 0
              ? `${selectedTools.length} tools selected`
              : "Select tools..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput
              placeholder="Search or create tool..."
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              <CommandEmpty>No tools found.</CommandEmpty>
              <CommandGroup>
                {inputValue && (
                  <CommandItem
                    value={`create-tool-${inputValue}`}
                    onSelect={() => handleCreate()}
                    className="font-semibold text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Create &quot;{inputValue}&quot;
                  </CommandItem>
                )}
                {tools.map((tool) => (
                  <CommandItem
                    key={tool.id}
                    value={tool.name}
                    onSelect={() => handleSelect(tool.id)}
                    className="data-[disabled]:pointer-events-auto"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedIds.includes(tool.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {tool.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div className="flex flex-wrap gap-1 min-h-[24px]">
        {selectedTools.map(tool => (
          <Badge key={tool.id} variant="secondary" className="cursor-pointer" onClick={() => handleSelect(tool.id)}>
            {tool.name} ×
          </Badge>
        ))}
      </div>
    </div>
  );
}
