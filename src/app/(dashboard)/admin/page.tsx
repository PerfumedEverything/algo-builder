"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminUsers, AdminBrokers } from "@/components/admin"
import { getUsersAction } from "@/server/actions/admin-actions"
import type { UserWithStats } from "@/server/repositories/user-repository"

export default function AdminPage() {
  const [users, setUsers] = useState<UserWithStats[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Админ-панель</h1>
        <p className="text-sm text-muted-foreground">Управление пользователями, брокерами и системой</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Пользователи</TabsTrigger>
          <TabsTrigger value="brokers">Брокеры</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-5">
          <AdminUsers
            users={users}
            currentUserId={currentUserId}
            onRefresh={fetchUsers}
          />
        </TabsContent>

        <TabsContent value="brokers" className="mt-5">
          <AdminBrokers />
        </TabsContent>
      </Tabs>
    </div>
  )
}
