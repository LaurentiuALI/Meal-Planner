'use server'

import { db } from '@/lib/db'
import { Slot } from '@/types'
import { revalidatePath } from 'next/cache'

export async function getSlots(): Promise<Slot[]> {
  const slots = await db.slot.findMany({
    orderBy: { sortOrder: 'asc' }
  })

  if (slots.length === 0) {
    // Seed default slots
    const defaults = [
      { name: 'Breakfast', time: '08:00', sortOrder: 0 },
      { name: 'Lunch', time: '13:00', sortOrder: 1 },
      { name: 'Dinner', time: '19:00', sortOrder: 2 },
    ]

    const createdSlots = []
    for (const d of defaults) {
      const s = await db.slot.create({ data: d })
      createdSlots.push(s)
    }
    return createdSlots
  }

  return slots
}

export async function addSlot(slot: Omit<Slot, 'id'>) {
  await db.slot.create({
    data: {
      name: slot.name,
      time: slot.time,
      sortOrder: slot.sortOrder
    }
  })
  revalidatePath('/plan')
}

export async function updateSlots(slots: Slot[]) {
  // Use transaction to update all
  // For simplicity, we can just update individually in a loop or delete all and recreate (risky if IDs matter)
  // Since IDs matter for stability (if we used them for linking, but we use slotName), 
  // currently we only use slotName. But we have IDs in the model.
  
  // Efficient way:
  for (const slot of slots) {
    await db.slot.update({
      where: { id: slot.id },
      data: {
        name: slot.name,
        time: slot.time,
        sortOrder: slot.sortOrder
      }
    })
  }
  revalidatePath('/plan')
}

export async function deleteSlot(id: string) {
  await db.slot.delete({ where: { id } })
  revalidatePath('/plan')
}
