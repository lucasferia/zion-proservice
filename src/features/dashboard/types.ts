export type DashboardPeriod = {
  start: string
  end: string
}

export type DashboardPriorityReturn = {
  id: string
  scheduled_date: string
  client_id: string
  client_name: string
  equipment_id: string
  equipment_name: string
  location_name: string | null
  days_overdue: number
  timing: 'overdue' | 'today'
}

export type DashboardPriorityMaintenance = {
  id: string
  work_order_number: string
  scheduled_at: string
  client_id: string
  client_name: string
  equipment_id: string
  equipment_name: string
  maintenance_type: 'preventive' | 'corrective'
}

export type DashboardPriorityInventory = {
  id: string
  name: string
  sku: string | null
  unit_of_measure: string
  current_quantity: number
  minimum_stock: number
  situation: 'critical' | 'out_of_stock'
}

export type DashboardCompletedMaintenance = {
  id: string
  work_order_number: string
  completed_at: string
  client_id: string
  client_name: string
  equipment_id: string
  equipment_name: string
  maintenance_type: 'preventive' | 'corrective'
  total_amount: number
}

export type DashboardUpcomingReturn = {
  id: string
  scheduled_date: string
  client_id: string
  client_name: string
  equipment_id: string
  equipment_name: string
  location_name: string | null
  days_until: number
}

export type OperationalDashboard = {
  period_start: string
  period_end: string
  timezone_name: 'America/Sao_Paulo'
  completed_maintenances: number
  in_progress_maintenances: number
  active_clients: number
  received_revenue: number
  overdue_returns: number
  today_returns: number
  next_7_returns: number
  inventory_attention: number
  inventory_critical: number
  inventory_out_of_stock: number
  priority_returns: DashboardPriorityReturn[]
  priority_maintenances: DashboardPriorityMaintenance[]
  priority_inventory: DashboardPriorityInventory[]
  latest_completed_maintenances: DashboardCompletedMaintenance[]
  upcoming_returns: DashboardUpcomingReturn[]
  is_new_organization: boolean
}
