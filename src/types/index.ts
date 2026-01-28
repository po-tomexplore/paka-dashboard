export interface Answer {
  label: string
  value: string
}

export interface ControlStatus {
  status: string
  scan_date: string
}

export interface Owner {
  first_name: string
  last_name: string
  email: string
}

export interface Buyer {
  id_acheteur: string
  email_acheteur: string
  acheteur_last_name: string
  acheteur_first_name: string
  answers?: Answer[]
}

export interface Participant {
  id_participant: number
  barcode: string
  create_date: string
  deleted: string
  paid: boolean
  owner: Owner
  control_status: ControlStatus
  id_ticket: string
  answers?: Answer[]
  buyer?: Buyer
}

export interface ParticipantResponse {
  participants: Participant[]
  server_time: string
  counter: number
  counter_deleted: number
  counter_total: number
}

export interface AgeRange {
  label: string
  min: number
  max: number
}

export interface TicketCategory {
  id: string
  name: string
  price: number
  participants: number
}
