export type ClientSummary = {
  id: string
  organization_id: string
  name: string
  phone: string | null
  email: string | null
  document: string | null
  notes: string | null
  created_at: string
  updated_at: string
  location_count: number
  cities: string[]
}

export type ClientLocation = {
  id: string
  organization_id: string
  client_id: string
  name: string
  postal_code: string | null
  street: string
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string
  state: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type ClientDetails = Omit<ClientSummary, 'location_count' | 'cities'> & {
  client_locations: ClientLocation[]
}

export type ClientInput = {
  name: string
  phone: string
  email: string
  document: string
  notes: string
}

export type ClientLocationInput = {
  name: string
  postal_code: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  notes: string
}

