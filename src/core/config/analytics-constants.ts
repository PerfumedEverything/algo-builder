export const DEPOSIT_RATE_ANNUAL = 0.15
export const RF_RATE = 0.15

export const HEALTH_WEIGHTS = { diversification: 0.4, risk: 0.3, performance: 0.3 } as const

export const SECTOR_LABELS: Record<string, string> = {
  finance: "Финансы",
  energy: "Энергетика",
  tech: "IT-сектор",
  metals: "Металлы",
  retail: "Ритейл",
  telecom: "Телеком",
  transport: "Транспорт",
  construction: "Строительство",
  utilities: "Энергосбыт",
  chemicals: "Химия",
  forestry: "Лесная промышленность",
  conglomerate: "Конгломерат",
  other: "Прочее",
}

export const MAJOR_SECTORS = ["finance", "energy", "tech", "metals", "retail"]
