import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export type BrokerStatus = "ACTIVE" | "LOCKED" | "COMING_SOON"

export type BrokerRow = {
  id: string
  name: string
  description: string | null
  logoUrl: string | null
  logoEmoji: string
  status: BrokerStatus
  providerKey: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type CreateBrokerInput = {
  name: string
  description?: string
  logoUrl?: string
  logoEmoji?: string
  status?: BrokerStatus
  providerKey: string
  sortOrder?: number
}

export type UpdateBrokerInput = Partial<Omit<CreateBrokerInput, "providerKey">>

export class BrokerCatalogRepository {
  async findAll(): Promise<BrokerRow[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("Broker")
      .select("*")
      .order("sortOrder", { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []) as BrokerRow[]
  }

  async findById(id: string): Promise<BrokerRow | null> {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from("Broker")
      .select("*")
      .eq("id", id)
      .single()

    if (error) return null
    return data as BrokerRow
  }

  async create(input: CreateBrokerInput): Promise<BrokerRow> {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from("Broker")
      .insert({
        name: input.name,
        description: input.description ?? null,
        logoUrl: input.logoUrl ?? null,
        logoEmoji: input.logoEmoji ?? "",
        status: input.status ?? "LOCKED",
        providerKey: input.providerKey,
        sortOrder: input.sortOrder ?? 0,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as BrokerRow
  }

  async update(id: string, input: UpdateBrokerInput): Promise<BrokerRow> {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from("Broker")
      .update({ ...input, updatedAt: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as BrokerRow
  }

  async delete(id: string): Promise<void> {
    const admin = createAdminClient()
    const { error } = await admin
      .from("Broker")
      .delete()
      .eq("id", id)

    if (error) throw new Error(error.message)
  }

  async uploadLogo(brokerId: string, file: Buffer, fileName: string): Promise<string> {
    const admin = createAdminClient()
    const path = `broker-logos/${brokerId}/${fileName}`

    const { error: uploadError } = await admin.storage
      .from("public")
      .upload(path, file, { upsert: true, contentType: "image/png" })

    if (uploadError) throw new Error(uploadError.message)

    const { data: urlData } = admin.storage
      .from("public")
      .getPublicUrl(path)

    await this.update(brokerId, { logoUrl: urlData.publicUrl })
    return urlData.publicUrl
  }
}
