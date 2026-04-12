'use client'

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { nanoid } from 'nanoid'
import type { FormBlock, FormDefinition } from '@/lib/forms/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

function SortableBlock ({
  block,
  onChange,
  onRemove,
}: {
  block: FormBlock
  onChange: (b: FormBlock) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="border-border bg-card/70 p-4 backdrop-blur-sm"
    >
      <div className="flex gap-3">
        <button
          type="button"
          className="mt-1 cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-xs uppercase text-muted-foreground">Type</Label>
            <Select
              value={block.type}
              onValueChange={(type) => {
                const id = block.id
                if (type === 'short_text') {
                  onChange({ id, type: 'short_text', label: block.label, required: false })
                } else if (type === 'long_text') {
                  onChange({ id, type: 'long_text', label: block.label, required: false })
                } else {
                  onChange({
                    id,
                    type: 'select',
                    label: block.label,
                    options: block.type === 'select' ? block.options : ['Option A', 'Option B'],
                    required: false,
                  })
                }
              }}
            >
              <SelectTrigger className="h-8 w-[160px] border-border bg-background/60 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short_text">Short text</SelectItem>
                <SelectItem value="long_text">Long text</SelectItem>
                <SelectItem value="select">Select</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="ghost" size="icon" className="ml-auto" onClick={onRemove}>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Label</Label>
            <Input
              value={block.label}
              onChange={(e) => onChange({ ...block, label: e.target.value } as FormBlock)}
              className="border-border bg-background/60"
            />
          </div>
          {(block.type === 'short_text' || block.type === 'long_text') && (
            <div className="space-y-1">
              <Label className="text-xs">Placeholder</Label>
              <Input
                value={block.placeholder ?? ''}
                onChange={(e) =>
                  onChange({ ...block, placeholder: e.target.value } as FormBlock)
                }
                className="border-border bg-background/60"
              />
            </div>
          )}
          {block.type === 'select' && (
            <div className="space-y-1">
              <Label className="text-xs">Options (one per line)</Label>
              <Textarea
                value={block.options.join('\n')}
                onChange={(e) =>
                  onChange({
                    ...block,
                    options: e.target.value
                      .split('\n')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                className="min-h-[88px] border-border bg-background/60 font-mono text-sm"
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export function FormBuilder ({
  value,
  onChange,
}: {
  value: FormDefinition
  onChange: (next: FormDefinition) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const blocks = value.blocks

  function sync (next: FormBlock[]) {
    onChange({ blocks: next })
  }

  function onDragEnd (event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = blocks.findIndex((b) => b.id === active.id)
    const newIndex = blocks.findIndex((b) => b.id === over.id)
    sync(arrayMove(blocks, oldIndex, newIndex))
  }

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {blocks.map((block) => (
              <SortableBlock
                key={block.id}
                block={block}
                onChange={(b) => sync(blocks.map((x) => (x.id === b.id ? b : x)))}
                onRemove={() => sync(blocks.filter((x) => x.id !== block.id))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button
        type="button"
        variant="outline"
        className="border-dashed border-border"
        onClick={() =>
          sync([
            ...blocks,
            {
              id: nanoid(),
              type: 'short_text',
              label: 'New question',
              required: false,
              placeholder: '',
            },
          ])
        }
      >
        <Plus className="mr-2 h-4 w-4" />
        Add field
      </Button>
    </div>
  )
}
