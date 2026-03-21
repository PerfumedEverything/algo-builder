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
  logoEmoji: string
  logoUrl: string
  status: BrokerStatus
  sortOrder: number
}

const emptyForm: BrokerFormData = {
  name: "",
  description: "",
  providerKey: "",
  logoEmoji: "",
  logoUrl: "",
  status: "LOCKED",
  sortOrder: 0,
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

  const fetchBrokers = useCallback(async () => {
    const res = await getBrokersAction()
    if (res.success) setBrokers(res.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchBrokers() }, [fetchBrokers])

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
      logoEmoji: broker.logoEmoji,
      logoUrl: broker.logoUrl ?? "",
      status: broker.status,
      sortOrder: broker.sortOrder,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.providerKey) {
      toast.error("Заполните название и ключ провайдера")
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        const res = await updateBrokerAction(editingId, {
          name: form.name,
          description: form.description || undefined,
          logoEmoji: form.logoEmoji,
          logoUrl: form.logoUrl || undefined,
          status: form.status,
          sortOrder: form.sortOrder,
        })
        if (res.success) {
          toast.success("Брокер обновлён")
        } else {
          toast.error(res.error)
          return
        }
      } else {
        const res = await createBrokerAction({
          name: form.name,
          description: form.description || undefined,
          providerKey: form.providerKey,
          logoEmoji: form.logoEmoji,
          logoUrl: form.logoUrl || undefined,
          status: form.status,
          sortOrder: form.sortOrder,
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium w-10">#</th>
                <th className="px-4 py-3 font-medium">Логотип</th>
                <th className="px-4 py-3 font-medium">Название</th>
                <th className="px-4 py-3 font-medium">Ключ</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {brokers.map((broker) => {
                const statusCfg = STATUS_CONFIG[broker.status] ?? STATUS_CONFIG.LOCKED
                return (
                  <tr key={broker.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
                        {broker.sortOrder}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {broker.logoUrl ? (
                        <img
                          src={broker.logoUrl}
                          alt={broker.name}
                          className="h-8 w-8 rounded-lg object-cover"
                        />
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Редактировать"
                          onClick={() => openEdit(broker)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Удалить"
                          onClick={() => handleDelete(broker.id, broker.name)}
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {brokers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Нет брокеров. Нажмите &quot;Добавить&quot; для создания.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Редактировать брокера" : "Новый брокер"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Название *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="T-Invest"
                />
              </div>
              <div className="space-y-2">
                <Label>Ключ провайдера *</Label>
                <Input
                  value={form.providerKey}
                  onChange={(e) => setForm((p) => ({ ...p, providerKey: e.target.value.toUpperCase() }))}
                  placeholder="TINKOFF"
                  disabled={!!editingId}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Описание</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Акции, облигации, ETF..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Эмодзи</Label>
                <Input
                  value={form.logoEmoji}
                  onChange={(e) => setForm((p) => ({ ...p, logoEmoji: e.target.value }))}
                  placeholder=""
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
                    <SelectItem value="ACTIVE">Активен</SelectItem>
                    <SelectItem value="LOCKED">Заблокирован</SelectItem>
                    <SelectItem value="COMING_SOON">Скоро</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Порядок</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Логотип</Label>
              <div className="flex items-center gap-3">
                {form.logoUrl ? (
                  <div className="relative">
                    <img
                      src={form.logoUrl}
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-border">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
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
                      Загрузить
                    </Button>
                  )}
                  <Input
                    value={form.logoUrl}
                    onChange={(e) => setForm((p) => ({ ...p, logoUrl: e.target.value }))}
                    placeholder="https://... или загрузите файл"
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
