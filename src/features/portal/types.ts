export type PortalCommercialStatus = 'trialing' | 'active'

export type PortalUnit = {
  id: string
  name: string
  city: string
  state: string
}

export type PortalContextData = {
  user: {
    fullName: string
  }
  organization: {
    name: string
  }
  academy: {
    name: string
  }
  access: {
    userStatus: 'active'
    commercialStatus: PortalCommercialStatus
    isTrialing: boolean
    userUpdatedAt: string
    commercialUpdatedAt: string
  }
  unitCount: number
  units: PortalUnit[]
}
