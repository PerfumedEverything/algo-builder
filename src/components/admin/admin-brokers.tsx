"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  Loader2,
  GripVertical,
  CheckCircle2,
  Clock,
  Lock,
  X,
  Image as ImageIcon,
} from "lucide-react"
import { toast } from "sonner"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragEndEvent } from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getBrokersAction,
  createBrokerAction,
  updateBrokerAction,
  deleteBrokerAction,
  uploadBrokerLogoAction,
} from "@/server/actions/admin-actions"
import type { BrokerRow, BrokerStatus } from "@/server/repositories/broker-catalog-repository"

const STATUS_CONFIG: Record<BrokerStatus, { label: string; color: string; icon: React.ReactNode }> = {
  ACTIVE: {
    label: "Активен",
    color: "bg-emerald-500/10 text-emerald-400",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  LOCKED: {
    label: "Заблокирован",
    color: "bg-red-500/10 text-red-400",
    icon: <Lock className="h-3 w-3" />,
  },
  COMING_SOON: {
    label: "Скоро",
    color: "bg-amber-500/10 text-amber-400",
    icon: <Clock className="h-3 w-3" />,
  },
}

type BrokerFormData = {
  name: string
  description: string
  providerKey: string
  logoUrl: string
  status: BrokerStatus
}

const emptyForm: BrokerFormData = {
  name: "",
  description: "",
  providerKey: "",
  logoUrl: "",
  status: "LOCKED",
}

type SortableBrokerRowProps = {
  broker: BrokerRow
  onEdit: (broker: BrokerRow) => void
  onDelete: (id: string, name: string) => void
}

const SortableBrokerRow = ({ broker, onEdit, onDelete }: SortableBrokerRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: broker.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const statusCfg = STATUS_CONFIG[broker.status] ?? STATUS_CONFIG.LOCKED

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-border last:border-0 hover:bg-muted/50">
      <td className="px-4 py-3">
        <button
          {...attributes}
          {...listeners}
          className="flex items-center gap-1 text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="px-4 py-3">
        {broker.logoUrl ? (
          <img src={broker.logoUrl.replace(/^https?:\/\/[^/]+/, "")} alt={broker.name} className="h-8 w-8 rounded-lg object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-lg">
            {broker.logoEmoji || "?"}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <div>
          <p className="font-medium">{broker.name}</p>
          {broker.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{broker.description}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{broker.providerKey}</code>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.color}`}>
          {statusCfg.icon}
          {statusCfg.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Редактировать" onClick={() => onEdit(broker)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Удалить" onClick={() => onDelete(broker.id, broker.name)}>
            <Trash2 className="h-4 w-4 text-red-400" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

export const AdminBrokers = () => {
  const [brokers, setBrokers] = useState<BrokerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<BrokerFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const fetchBrokers = useCallback(async () => {
    const res = await getBrokersAction()
    if (res.success) setBrokers(res.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchBrokers() }, [fetchBrokers])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = brokers.findIndex((b) => b.id === active.id)
    const newIndex = brokers.findIndex((b) => b.id === over.id)
    const reordered = arrayMove(brokers, oldIndex, newIndex)

    setBrokers(reordered)

    const updates = reordered.map((b, i) =>
      updateBrokerAction(b.id, { sortOrder: i + 1 }),
    )
    await Promise.all(updates)
    toast.success("Порядок сохранён")
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (broker: BrokerRow) => {
    setEditingId(broker.id)
    setForm({
      name: broker.name,
      description: broker.description ?? "",
      providerKey: broker.providerKey,
      logoUrl: broker.logoUrl ?? "",
      status: broker.status,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name) {
      toast.error("Заполните название")
      return
    }
    if (!editingId && !form.providerKey) {
      toast.error("Заполните ключ провайдера")
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        const res = await updateBrokerAction(editingId, {
          name: form.name,
          description: form.description || undefined,
          logoUrl: form.logoUrl || undefined,
          status: form.status,
        })
        if (res.success) {
          toast.success("Брокер обновлён")
        } else {
          toast.error(res.error)
          return
        }
      } else {
        const nextOrder = brokers.length > 0
          ? Math.max(...brokers.map((b) => b.sortOrder)) + 1
          : 1
        const res = await createBrokerAction({
          name: form.name,
          description: form.description || undefined,
          providerKey: form.providerKey,
          logoUrl: form.logoUrl || undefined,
          status: form.status,
          sortOrder: nextOrder,
        })
        if (res.success) {
          toast.success("Брокер создан")
        } else {
          toast.error(res.error)
          return
        }
      }
      setDialogOpen(false)
      fetchBrokers()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Удалить брокера "${name}"?`)) return
    const res = await deleteBrokerAction(id)
    if (res.success) {
      toast.success("Брокер удалён")
      fetchBrokers()
    } else {
      toast.error(res.error)
    }
  }

  const handleUploadLogo = async (brokerId: string) => {
    const input = fileInputRef.current
    if (!input?.files?.[0]) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("logo", input.files[0])
      const res = await uploadBrokerLogoAction(brokerId, formData)
      if (res.success) {
        toast.success("Логотип загружен")
        setForm((prev) => ({ ...prev, logoUrl: res.data.logoUrl }))
        fetchBrokers()
      } else {
        toast.error(res.error)
      }
    } finally {
      setUploading(false)
      if (input) input.value = ""
    }
  }

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {brokers.length} {brokers.length === 1 ? "брокер" : "брокеров"} в каталоге
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          Добавить
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium w-10" />
                  <th className="px-4 py-3 font-medium">Логотип</th>
                  <th className="px-4 py-3 font-medium">Название</th>
                  <th className="px-4 py-3 font-medium">Ключ</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3 font-medium text-right">Действия</th>
                </tr>
              </thead>
              <SortableContext items={brokers.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <tbody>
                  {brokers.map((broker) => (
                    <SortableBrokerRow
                      key={broker.id}
                      broker={broker}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                  {brokers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Нет брокеров. Нажмите &quot;Добавить&quot; для создания.
                      </td>
                    </tr>
                  )}
                </tbody>
              </SortableContext>
            </table>
          </DndContext>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={() => editingId && handleUploadLogo(editingId)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Редактировать брокера" : "Новый брокер"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="T-Invest"
              />
            </div>

            {!editingId && (
              <div className="space-y-2">
                <Label>Ключ провайдера</Label>
                <Input
                  value={form.providerKey}
                  onChange={(e) => setForm((p) => ({ ...p, providerKey: e.target.value.toUpperCase() }))}
                  placeholder="TINKOFF"
                />
                <p className="text-xs text-muted-foreground">Уникальный идентификатор для привязки к коду. Нельзя изменить после создания.</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Описание</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Акции, облигации, ETF..."
              />
            </div>

            <div className="space-y-2">
              <Label>Статус</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((p) => ({ ...p, status: v as BrokerStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Активен — можно подключить</SelectItem>
                  <SelectItem value="COMING_SOON">Скоро — показан, но недоступен</SelectItem>
                  <SelectItem value="LOCKED">Скрыт — не показывается</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Логотип</Label>
              <div className="flex items-center gap-3">
                {form.logoUrl ? (
                  <div className="relative">
                    <img
                      src={form.logoUrl.replace(/^https?:\/\/[^/]+/, "")}
                      alt="Logo"
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                    <button
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                      onClick={() => setForm((p) => ({ ...p, logoUrl: "" }))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-border">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-2">
                  {editingId && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploading ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Загрузить файл
                    </Button>
                  )}
                  <Input
                    value={form.logoUrl}
                    onChange={(e) => setForm((p) => ({ ...p, logoUrl: e.target.value }))}
                    placeholder="https://..."
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {editingId ? "Сохранить" : "Создать"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
