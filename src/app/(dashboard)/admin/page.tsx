"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Loader2,
  Users,
  UserCheck,
  Ban,
  Eye,
  ShieldCheck,
  ShieldOff,
  Lock,
  Unlock,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getUsersAction,
  updateUserRoleAction,
  blockUserAction,
} from "@/server/actions/admin-actions"
import type { UserRole, UserWithStats } from "@/server/repositories/user-repository"

type StatCardProps = {
  label: string
  value: number
  icon: React.ReactNode
}

const StatCard = ({ label, value, icon }: StatCardProps) => (
  <div className="rounded-xl border border-border bg-card p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
        {icon}
      </div>
    </div>
  </div>
)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

const UserDetailRow = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex items-center justify-between border-b border-border/50 py-2.5 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium">{value}</span>
  </div>
)

export default function AdminPage() {
  const [users, setUsers] = useState<UserWithStats[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [viewUser, setViewUser] = useState<UserWithStats | null>(null)

  const fetchUsers = useCallback(async () => {
    const res = await getUsersAction()
    if (res.success) {
      setUsers(res.data.users)
      setCurrentUserId(res.data.currentUserId)
    } else {
      toast.error(res.error)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleToggleRole = async (userId: string, currentRole: UserRole) => {
    const newRole: UserRole = currentRole === "ADMIN" ? "USER" : "ADMIN"
    const res = await updateUserRoleAction(userId, newRole)
    if (res.success) {
      toast.success(`Роль изменена на ${newRole}`)
      fetchUsers()
    } else {
      toast.error(res.error)
    }
  }

  const handleToggleBlock = async (userId: string, currentBlocked: boolean) => {
    const res = await blockUserAction(userId, !currentBlocked)
    if (res.success) {
      toast.success(currentBlocked ? "Пользователь разблокирован" : "Пользователь заблокирован")
      fetchUsers()
    } else {
      toast.error(res.error)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const totalUsers = users.length
  const activeUsers = users.filter((u) => !u.blocked).length
  const blockedUsers = users.filter((u) => u.blocked).length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Админ-панель</h1>
        <p className="text-sm text-muted-foreground">Управление пользователями и ролями</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Всего" value={totalUsers} icon={<Users className="h-5 w-5 text-muted-foreground" />} />
        <StatCard label="Активных" value={activeUsers} icon={<UserCheck className="h-5 w-5 text-emerald-400" />} />
        <StatCard label="Заблокированных" value={blockedUsers} icon={<Ban className="h-5 w-5 text-red-400" />} />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Имя</th>
                <th className="px-4 py-3 font-medium">Роль</th>
                <th className="px-4 py-3 font-medium text-center">Стратегий</th>
                <th className="px-4 py-3 font-medium text-center">Сигналов</th>
                <th className="px-4 py-3 font-medium">Регистрация</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === currentUserId
                return (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">
                      {user.email}
                      {isSelf && (
                        <span className="ml-1.5 text-xs text-muted-foreground">(вы)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.role === "ADMIN"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {user.role === "ADMIN" ? <ShieldCheck className="h-3 w-3" /> : null}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{user.strategiesCount}</td>
                    <td className="px-4 py-3 text-center">{user.signalsCount}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      {user.blocked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
                          <Ban className="h-3 w-3" />
                          Заблокирован
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                          Активен
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Просмотр"
                          onClick={() => setViewUser(user)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!isSelf && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title={user.role === "ADMIN" ? "Снять админа" : "Сделать админом"}
                              onClick={() => handleToggleRole(user.id, user.role)}
                            >
                              {user.role === "ADMIN" ? (
                                <ShieldOff className="h-4 w-4" />
                              ) : (
                                <ShieldCheck className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title={user.blocked ? "Разблокировать" : "Заблокировать"}
                              onClick={() => handleToggleBlock(user.id, user.blocked)}
                            >
                              {user.blocked ? (
                                <Unlock className="h-4 w-4 text-emerald-400" />
                              ) : (
                                <Lock className="h-4 w-4 text-red-400" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!viewUser} onOpenChange={() => setViewUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Профиль пользователя</DialogTitle>
          </DialogHeader>
          {viewUser && (
            <div>
              <UserDetailRow label="Email" value={viewUser.email} />
              <UserDetailRow label="Имя" value={viewUser.name ?? "—"} />
              <UserDetailRow label="Роль" value={viewUser.role} />
              <UserDetailRow label="Статус" value={viewUser.blocked ? "Заблокирован" : "Активен"} />
              <UserDetailRow label="Стратегий" value={viewUser.strategiesCount} />
              <UserDetailRow label="Сигналов" value={viewUser.signalsCount} />
              <UserDetailRow label="Регистрация" value={formatDate(viewUser.createdAt)} />
              <UserDetailRow label="ID" value={viewUser.id} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
